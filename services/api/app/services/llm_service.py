import re
import json
import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.schemas.quiz import GeneratedQuiz, GeneratedQuestion, GeneratedOption, QuestionType, QuizDifficulty
from app.schemas.attempt import SubjectiveGradingResult

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.gemini_client = None
        self.openai_client = None

        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.warning(f"Google GenAI Client init failed in LLMService: {e}")

        if settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                import instructor
                self.openai_client = instructor.from_openai(OpenAI(api_key=settings.OPENAI_API_KEY))
            except Exception as e:
                logger.warning(f"OpenAI / Instructor Client init failed in LLMService: {e}")

    async def generate_grounded_quiz(
        self,
        context_chunks: List[Dict[str, Any]],
        title: str,
        subject: str,
        grade_level: str,
        difficulty: QuizDifficulty,
        question_count: int,
        question_types: List[QuestionType],
        topic_focus: Optional[List[str]] = None,
    ) -> GeneratedQuiz:
        """
        Generates psychometric questions strictly grounded in context chunks.
        """
        # Format context chunks with clear XML boundaries to prevent prompt injection
        formatted_chunks = []
        for c in context_chunks:
            idx = c.get("chunk_index", 0)
            pg = c.get("page_number", "N/A")
            head = c.get("section_heading") or ""
            content = c.get("content", "")
            formatted_chunks.append(
                f'<chunk index="{idx}" page="{pg}" heading="{head}">\n{content}\n</chunk>'
            )
        all_context_xml = "\n".join(formatted_chunks)

        system_prompt = (
            "You are an expert educational assessment author and psychometric test designer. "
            "Your task is to generate high-quality assessment questions strictly grounded in the provided educational document material.\n\n"
            "CRITICAL RULES:\n"
            "1. Grounding: Every question must be derived EXCLUSIVELY from the provided context chunks. Do not extrapolate, infer outside facts, or hallucinate.\n"
            "2. Citation: For each question, provide the exact verbatim excerpt in `citation_quote` and the corresponding `context_chunk_index`.\n"
            "3. Distractor Quality: For single_choice and multi_choice questions, provide 4 distinct, plausible options. Exactly 1 option must be marked is_correct=True for single_choice and true_false.\n"
            "4. Explanation: Provide a comprehensive explanation detailing why the correct answer is true and why distractors are incorrect.\n"
            "5. Format: Strictly return a valid JSON object matching the GeneratedQuiz schema."
        )

        user_prompt = (
            f"Generate an educational quiz titled '{title}' for subject '{subject}' at '{grade_level}' level.\n"
            f"Difficulty: {difficulty}\n"
            f"Question count: {question_count}\n"
            f"Question types requested: {', '.join(question_types)}\n"
            f"Topic focus: {', '.join(topic_focus) if topic_focus else 'All key concepts in material'}\n\n"
            f"<context_chunks>\n{all_context_xml}\n</context_chunks>"
        )

        import os
        is_test = os.environ.get("ENVIRONMENT") == "test" or settings.ENVIRONMENT == "test"
        if is_test:
            return self._generate_grounded_fallback(
                context_chunks=context_chunks,
                title=title,
                subject=subject,
                difficulty=difficulty,
                question_count=question_count,
                question_types=question_types,
            )

        # 1. Try Gemini if configured
        if self.gemini_client and settings.GEMINI_API_KEY:
            try:
                # Use current recommended Gemini model (e.g. gemini-3.8-flash)
                model_name = settings.DEFAULT_LLM_MODEL.replace("gemini/", "")
                if "gemini" not in model_name:
                    model_name = "gemini-3.8-flash"
                resp = self.gemini_client.models.generate_content(
                    model=model_name,
                    contents=f"{system_prompt}\n\n{user_prompt}",
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": GeneratedQuiz,
                    }
                )
                if resp.text:
                    parsed = json.loads(resp.text)
                    return GeneratedQuiz.model_validate(parsed)
            except Exception as e:
                logger.warning(f"Gemini quiz generation failed: {e}. Falling back.")

        # 2. Try OpenAI Instructor if configured
        if self.openai_client and settings.OPENAI_API_KEY:
            try:
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o",
                    response_model=GeneratedQuiz,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.3,
                )
                return response
            except Exception as e:
                logger.warning(f"OpenAI quiz generation failed: {e}. Falling back.")

        # 3. Deterministic Grounded Fallback (Offline / Test Mode)
        return self._generate_grounded_fallback(
            context_chunks=context_chunks,
            title=title,
            subject=subject,
            difficulty=difficulty,
            question_count=question_count,
            question_types=question_types,
        )

    async def evaluate_subjective_answer(
        self,
        question_text: str,
        citation_quote: Optional[str],
        rubric_criteria: Optional[Dict[str, Any]],
        student_response: str,
        max_points: float = 1.0,
    ) -> SubjectiveGradingResult:
        """
        Evaluates a student's short answer or subjective essay against rubric criteria.
        """
        if not student_response or not student_response.strip():
            return SubjectiveGradingResult(
                score=0.0,
                feedback="No answer provided. To earn credit, explain the core concepts.",
                key_points_missed=["Conceptual explanation", "Key terminology"]
            )

        system_prompt = (
            "You are an objective academic evaluator. Grade the student's written response against the "
            "question rubric and source material. Provide an accurate numerical score (between 0.0 and max_points), "
            "clear pedagogical feedback, and identify any key points missed."
        )

        user_prompt = (
            f"Question: {question_text}\n"
            f"Reference / Grounding Citation: {citation_quote or 'N/A'}\n"
            f"Rubric / Scoring Criteria: {json.dumps(rubric_criteria or {})}\n"
            f"Max Points: {max_points}\n"
            f"Student Answer: {student_response}"
        )

        import os
        is_test = os.environ.get("ENVIRONMENT") == "test" or settings.ENVIRONMENT == "test"
        if is_test:
            return self._heuristic_subjective_evaluation(
                question_text=question_text,
                citation_quote=citation_quote,
                rubric_criteria=rubric_criteria,
                student_response=student_response,
                max_points=max_points,
            )

        # 1. Try Gemini if configured
        if self.gemini_client and settings.GEMINI_API_KEY:
            try:
                model_name = settings.DEFAULT_LLM_MODEL.replace("gemini/", "")
                if "gemini" not in model_name:
                    model_name = "gemini-3.8-flash"
                resp = self.gemini_client.models.generate_content(
                    model=model_name,
                    contents=f"{system_prompt}\n\n{user_prompt}",
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": SubjectiveGradingResult,
                    }
                )
                if resp.text:
                    parsed = json.loads(resp.text)
                    return SubjectiveGradingResult.model_validate(parsed)
            except Exception as e:
                logger.warning(f"Gemini subjective grading failed: {e}. Falling back.")

        # 2. Try OpenAI Instructor if configured
        if self.openai_client and settings.OPENAI_API_KEY:
            try:
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o",
                    response_model=SubjectiveGradingResult,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.2,
                )
                return response
            except Exception as e:
                logger.warning(f"OpenAI subjective grading failed: {e}. Falling back.")

        # 3. Deterministic heuristic rubric grader (Offline / Test Mode)
        return self._heuristic_subjective_evaluation(
            question_text=question_text,
            citation_quote=citation_quote,
            rubric_criteria=rubric_criteria,
            student_response=student_response,
            max_points=max_points,
        )

    def _generate_grounded_fallback(
        self,
        context_chunks: List[Dict[str, Any]],
        title: str,
        subject: str,
        difficulty: str,
        question_count: int,
        question_types: List[QuestionType],
    ) -> GeneratedQuiz:
        """
        Deterministic, robust offline fallback that extracts facts directly
        from context chunks to build questions with citations.
        """
        questions: List[GeneratedQuestion] = []
        if not context_chunks:
            context_chunks = [{
                "chunk_index": 0,
                "content": f"{subject} involves core principles, analytical methods, and practical applications.",
                "page_number": 1
            }]

        available_types = question_types if question_types else ["single_choice", "true_false", "short_answer"]

        for q_idx in range(question_count):
            chunk = context_chunks[q_idx % len(context_chunks)]
            chunk_content = chunk.get("content", "").strip()
            chunk_idx = chunk.get("chunk_index", 0)

            # Extract substantive sentences from the chunk
            sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", chunk_content) if len(s.strip()) > 30]
            target_sentence = sentences[q_idx % len(sentences)] if sentences else chunk_content[:150]

            q_type = available_types[q_idx % len(available_types)]

            if q_type == "true_false":
                q_text = f"According to the source material, is the following statement true: '{target_sentence}'?"
                options = [
                    GeneratedOption(text="True", is_correct=True),
                    GeneratedOption(text="False", is_correct=False),
                ]
                explanation = f"As stated directly in the text: '{target_sentence}'"
            elif q_type == "short_answer":
                q_text = f"Based on the text, summarize the key concept described here: '{target_sentence[:100]}...'?"
                options = []
                explanation = f"The source text specifies: '{target_sentence}'"
            elif q_type == "multi_choice":
                q_text = f"Which of the following statements align with the passage regarding {subject}?"
                options = [
                    GeneratedOption(text=target_sentence, is_correct=True),
                    GeneratedOption(text=f"The text confirms that {subject} requires no validation.", is_correct=False),
                    GeneratedOption(text="The opposite of this principle is always true in standard practice.", is_correct=False),
                    GeneratedOption(text="This concept was historically discarded prior to modern computation.", is_correct=False),
                ]
                explanation = f"The text confirms: '{target_sentence}'"
            else:  # single_choice default
                # Extract subject or key phrase
                words = target_sentence.split()
                key_phrase = " ".join(words[:4]) if len(words) >= 4 else "the core concept"
                q_text = f"What is true regarding {key_phrase} based on the reading?"
                options = [
                    GeneratedOption(text=f"It is defined as: {target_sentence}", is_correct=True),
                    GeneratedOption(text=f"It contradicts standard principles of {subject}.", is_correct=False),
                    GeneratedOption(text="It is an obsolete concept with no current utility.", is_correct=False),
                    GeneratedOption(text="It applies exclusively to unsupported edge cases.", is_correct=False),
                ]
                explanation = f"Correct. The passage states: '{target_sentence}'"

            questions.append(GeneratedQuestion(
                question_text=q_text,
                question_type=q_type,
                points=1.0,
                options=options,
                explanation=explanation,
                citation_quote=target_sentence,
                context_chunk_index=chunk_idx,
                rubric_criteria={"expected_terms": target_sentence.split()[:5]},
            ))

        return GeneratedQuiz(
            quiz_title=title,
            subject=subject,
            difficulty=difficulty,
            questions=questions
        )

    def _heuristic_subjective_evaluation(
        self,
        question_text: str,
        citation_quote: Optional[str],
        rubric_criteria: Optional[Dict[str, Any]],
        student_response: str,
        max_points: float = 1.0,
    ) -> SubjectiveGradingResult:
        """Heuristic grading based on overlap with citation keywords and rubric criteria."""
        student_words = set(re.findall(r"\b\w{3,}\b", student_response.lower()))
        target_words = set()

        if citation_quote:
            target_words.update(re.findall(r"\b\w{3,}\b", citation_quote.lower()))
        if rubric_criteria and "expected_terms" in rubric_criteria:
            terms = rubric_criteria["expected_terms"]
            if isinstance(terms, list):
                target_words.update([str(t).lower() for t in terms])

        # Remove very common stopwords
        stopwords = {"the", "and", "that", "this", "with", "from", "for", "are", "was", "were"}
        target_words = target_words - stopwords

        if not target_words:
            # Simple length-based heuristic
            score = max_points if len(student_response) > 40 else max_points * 0.5
            return SubjectiveGradingResult(
                score=round(score, 1),
                feedback="Good response addressing the primary question prompt.",
                key_points_missed=[]
            )

        matched = student_words.intersection(target_words)
        ratio = len(matched) / max(1, len(target_words))

        score = min(max_points, round(ratio * max_points * 1.5, 1))
        # Minimum baseline for substantive answer
        if len(student_response) > 50 and score == 0.0:
            score = round(max_points * 0.5, 1)

        missed = list(target_words - matched)[:3]
        if score >= max_points * 0.8:
            feedback = "Excellent response! Key concepts and terminology were accurately incorporated."
        elif score >= max_points * 0.5:
            feedback = "Satisfactory answer, but could be enhanced with specific terminology from the source text."
        else:
            feedback = "The answer partially addresses the prompt but lacks essential grounding concepts."

        return SubjectiveGradingResult(
            score=min(max_points, max(0.0, score)),
            feedback=feedback,
            key_points_missed=missed
        )

llm_service = LLMService()
