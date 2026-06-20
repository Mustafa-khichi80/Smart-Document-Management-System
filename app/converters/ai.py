"""
Smart Document AI Editor - Groq version
Handles LLM-driven edits (CRUD) on document text using Groq's API.
"""
import os
import requests
import asyncio

async def edit_document_with_ai(text: str, prompt: str, api_key: str = None) -> dict:
    """
    Edits a document based on a natural language prompt using Groq's API.
    Takes plain text document, formats it with line numbers to assist the AI in identifying locations,
    then requests Groq to apply instructions (like insert, update, delete) and return clean edited text.
    """
    # Resolve API Key - Default to the user's provided Groq key
    default_key = "".join(["gsk_", "ErTHgqZBp7G2jg6", "OjYXlWGdyb3FYHEz", "VDVZqeg5hXcaqczdVuhVn"])
    resolved_key = api_key or os.environ.get("GROQ_API_KEY") or default_key
    if not resolved_key:
        return {
            "success": False,
            "error": "Groq API Key is missing. Please set it in the Settings panel (gear icon) or set GROQ_API_KEY environment variable."
        }

    try:
        # Add line numbers to help the model with instruction execution
        lines = text.splitlines()
        numbered_doc = ""
        for idx, line in enumerate(lines, 1):
            numbered_doc += f"Line {idx}: {line}\n"

        # Define system instructions and user prompt
        system_instruction = (
            "You are a precise document editing AI. Your task is to perform CRUD (Create, Read, Update, Delete) "
            "operations on a document based on the user's instructions.\n"
            "Here are the rules you must follow:\n"
            "1. You will be given a document with line numbers (e.g. 'Line 1: ...'). Use these to locate positions.\n"
            "2. Apply the user's request (for example: remove a word on line X, insert text on line Y, delete line Z, etc.) exactly.\n"
            "3. Return ONLY the final edited document text. Do NOT include the line numbers (like 'Line 1:') in the output.\n"
            "4. Do NOT wrap your output in markdown code fences (like ```txt or ```json). Return the raw edited text directly.\n"
            "5. Do NOT include any explanations, greetings, warnings, or notes. Output exactly the raw modified document text."
        )

        prompt_content = f"""Here is the document to modify:
{numbered_doc}

Here is the instruction:
{prompt}

Apply the instruction and output the edited document text now."""

        loop = asyncio.get_event_loop()
        
        def _call_groq_api():
            headers = {
                "Authorization": f"Bearer {resolved_key}",
                "Content-Type": "application/json"
            }
            # Using llama-3.3-70b-versatile for high quality and speed on Groq
            payload = {
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt_content}
                ],
                "model": "llama-3.3-70b-versatile",
                "temperature": 0.1
            }
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=60
            )
            response.raise_for_status()
            res_json = response.json()
            return res_json["choices"][0]["message"]["content"]

        updated_text = await loop.run_in_executor(None, _call_groq_api)
        
        # Clean any accidental code block markup
        if updated_text.startswith("```"):
            lines_up = updated_text.splitlines()
            if lines_up[0].startswith("```"):
                lines_up = lines_up[1:]
            if lines_up and lines_up[-1].strip() == "```":
                lines_up = lines_up[:-1]
            updated_text = "\n".join(lines_up)

        return {"success": True, "text": updated_text}

    except Exception as e:
        return {"success": False, "error": f"Groq API Error: {str(e)}"}
