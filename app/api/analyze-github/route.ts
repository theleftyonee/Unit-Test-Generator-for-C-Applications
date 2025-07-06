import { NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const { githubUrl } = await request.json()

    if (!githubUrl) {
      return NextResponse.json(
        { error: "GitHub URL is required", success: false },
        { status: 400 }
      )
    }

    console.log("Analyzing GitHub repository:", githubUrl)

    // Run the Python analyzer script
    const analysisResult = await analyzeGitHubRepository(githubUrl)

    if (analysisResult.error) {
      return NextResponse.json(
        { error: analysisResult.error, success: false },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      message: `Successfully analyzed ${analysisResult.files_analyzed} C++ files`
    })

  } catch (error) {
    console.error("GitHub analysis error:", error)
    return NextResponse.json(
      { 
        error: "Failed to analyze GitHub repository", 
        details: error instanceof Error ? error.message : "Unknown error",
        success: false 
      },
      { status: 500 }
    )
  }
}

async function analyzeGitHubRepository(githubUrl: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "github_analyzer.py")
    
    const pythonProcess = spawn("python", [scriptPath, githubUrl], {
      stdio: ["pipe", "pipe", "pipe"]
    })

    let stdout = ""
    let stderr = ""

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    pythonProcess.on("close", (code) => {
      try {
        // Try to parse stdout as JSON first (even for errors)
        const result = JSON.parse(stdout)
        if (result.error) {
          reject(new Error(result.error))
        } else {
          resolve(result)
        }
      } catch (parseError) {
        // If stdout is not valid JSON, check stderr for error messages
        if (stderr) {
          reject(new Error(`Analysis failed: ${stderr}`))
        } else if (stdout) {
          reject(new Error(`Analysis failed: ${stdout}`))
        } else {
          reject(new Error(`Analysis failed with code ${code}`))
        }
      }
    })

    pythonProcess.on("error", (error) => {
      reject(new Error(`Failed to start analysis: ${error.message}`))
    })

    // Set timeout
    setTimeout(() => {
      pythonProcess.kill()
      reject(new Error("Analysis timed out after 5 minutes"))
    }, 300000) // 5 minutes
  })
} 