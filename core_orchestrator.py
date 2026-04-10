import os
import shutil
import subprocess
import requests
from google import genai
from google.genai import types
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel

# Force Python to load the .env file in the current directory
load_dotenv()

# Initialize the global console for the UI
console = Console()

class AutonomousPipeline:
    def __init__(self):
        # 1. Securely load the API key from the .env file
        api_key = os.environ.get("GEMINI_API_KEY")
        
        if not api_key or api_key == "your_actual_api_key_here":
            raise ValueError(
                "\nCRITICAL: GEMINI_API_KEY is missing or invalid.\n"
                "FIX: Ensure you have a '.env' file in your Autonomous folder with the line:\n"
                "GEMINI_API_KEY=\"AIza...your_real_key_here\""
            )
        
        self.gemini_client = genai.Client(api_key=api_key)
        # UPDATED: Pointing directly to the modern v1beta flagship endpoint
        self.gemini_model = 'gemini-2.0-flash'
        
        # 2. Define the local Ollama endpoint
        self.ollama_url = "http://localhost:11434/api/generate"
        self.local_model = "deepseek-r1:8b"

    def run_jules_review(self, target_directory: str) -> str:
        """Executes Jules locally and safely captures all output streams."""
        # Resolve the jules binary: honour JULES_BIN env var, otherwise find on PATH.
        jules_bin = os.environ.get("JULES_BIN") or shutil.which("jules")
        if not jules_bin:
            console.print("[bold red]Jules binary not found.[/bold red] Set JULES_BIN or ensure 'jules' is on PATH.")
            return ""
        try:
            # IMPORTANT: shell=False prevents shell injection vulnerabilities.
            result = subprocess.run(
                [jules_bin, 'review', target_directory],
                capture_output=True,
                text=True,
                check=False  # Allow us to manually catch and print errors
            )
            
            # Node CLIs often output to stderr. We capture both to be safe.
            combined_output = (result.stdout + "\n" + result.stderr).strip()
            
            if result.returncode != 0:
                console.print(f"[bold red]Jules encountered an issue (Exit Code {result.returncode}):[/bold red]\n{combined_output}")
                return combined_output
                
            return combined_output

        except Exception as e:
            console.print(f"[bold red]Jules execution encountered a critical Python error:[/bold red] {e}")
            return ""

    def get_gemini_architecture(self, jules_report: str, goal: str) -> str:
        """Securely passes the Jules report to the Gemini API for strategic planning."""
        system_instruction = (
            "You are the Lead Architect for the 'Autonomous' system. "
            "Review the tactical findings from Jules and output a strict, "
            "step-by-step implementation plan for a local LLM to execute. "
            "Do not write final code, only the architectural logic."
        )
        prompt = f"Goal: {goal}\n\nJules Findings:\n{jules_report}"

        try:
            response = self.gemini_client.models.generate_content(
                model=self.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2, 
                )
            )
            return response.text
        except Exception as e:
            console.print(f"[bold red]API communication failed:[/bold red] {e}")
            return ""

    def execute_with_deepseek(self, execution_plan: str) -> str:
        """Dispatches the plan to the local DeepSeek instance via Ollama."""
        strict_prompt = (
            f"Execute the following architectural plan strictly. "
            f"Output ONLY raw, valid code. Do not include markdown formatting (like ```python). "
            f"Do not include explanations. Just the code:\n\n{execution_plan}"
        )
        
        payload = {
            "model": self.local_model,
            "prompt": strict_prompt,
            "stream": False
        }
        
        try:
            response = requests.post(self.ollama_url, json=payload, timeout=300)
            response.raise_for_status()
            
            raw_code = response.json().get("response", "")
            raw_code = raw_code.replace("```python\n", "").replace("```python", "").replace("```", "")
            return raw_code
            
        except requests.exceptions.RequestException as e:
            console.print(f"[bold red]Ollama local execution failed:[/bold red] {e}")
            return ""

    def secure_git_commit(self, file_path: str, code_content: str, branch_name: str) -> bool:
        """Writes AI code to a file and safely commits it to an isolated Git branch."""
        try:
            subprocess.run(['git', 'checkout', '-b', branch_name], check=True, capture_output=True)
            
            with open(file_path, 'w') as f:
                f.write(code_content)

            subprocess.run(['git', 'add', file_path], check=True, capture_output=True)
            commit_msg = f"Autonomous Agent: Proposed architecture changes for {file_path}"
            subprocess.run(['git', 'commit', '-m', commit_msg], check=True, capture_output=True)
            
            subprocess.run(['git', 'checkout', 'main'], check=True, capture_output=True)
            return True

        except subprocess.CalledProcessError as e:
            console.print(f"[bold red]Git operation failed:[/bold red] {e.stderr}")
            subprocess.run(['git', 'checkout', 'main'], capture_output=True)
            return False

# --- Pipeline Execution ---
if __name__ == "__main__":
    pipeline = AutonomousPipeline()
    
    current_goal = "Analyze the project structure and establish a secure baseline."
    target_file = "core_orchestrator.py" 
    branch_name = "agent/security-baseline"
    
    console.print(Panel(f"[bold cyan]Target File:[/bold cyan] {target_file}\n[bold cyan]Objective:[/bold cyan] {current_goal}", title="[bold green]Autonomous Boot Sequence Initiated[/bold green]", border_style="green"))

    with console.status("[bold yellow]Jules is executing tactical code review...", spinner="bouncingBar"):
        jules_output = pipeline.run_jules_review(target_file)
    
    if jules_output:
        console.print("[bold green]✔ Tactical Review Complete[/bold green]")
        
        with console.status("[bold blue]Gemini is generating strategic architectural plan...", spinner="dots2"):
            action_plan = pipeline.get_gemini_architecture(jules_output, current_goal)
        
        if action_plan:
            console.print("[bold green]✔ Strategic Plan Received[/bold green]")
            console.print(Panel(action_plan, title="Gemini Architecture", border_style="blue"))
            
            with console.status("[bold magenta]DeepSeek (Ollama) is synthesizing code. Please wait...", spinner="aesthetic"):
                final_code_output = pipeline.execute_with_deepseek(action_plan)
            
            if final_code_output:
                console.print("[bold green]✔ Local Execution Complete[/bold green]")
                console.print(f"\n[bold yellow]Preparing to isolate and commit code to branch: {branch_name}[/bold yellow]")
                
                success = pipeline.secure_git_commit(target_file, final_code_output, branch_name)
                
                if success:
                    console.print(Panel(
                        f"[bold green]System Successfully Sandboxed![/bold green]\n"
                        f"Run this command to review what the AI wrote:\n"
                        f"[bold cyan]git diff main {branch_name}[/bold cyan]", 
                        title="Execution Report", border_style="green"
                    ))
    else:
        console.print("[bold red]✖ Tactical Review Returned Empty.[/bold red]")
        console.print("[yellow]Jules found no issues, or the command failed silently. The pipeline halted to prevent overwriting code with an empty plan.[/yellow]")
