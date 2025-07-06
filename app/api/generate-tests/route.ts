import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Add LLM provider interface
interface LLMProvider {
  type: "openai" | "ollama" | "llamacpp" | "textgen"
  endpoint?: string
  model: string
  apiKey?: string
}

// Update the POST function to accept provider configuration
export async function POST(request: NextRequest) {
  console.log("API route called - starting request processing")

  try {
    // Parse request body with error handling
    let body: any
    try {
      body = await request.json()
      console.log("Request body parsed successfully:", {
        hasCode: !!body.cppCode,
        hasGithubUrl: !!body.githubUrl,
        step: body.step,
        providerType: body.provider?.type,
        hasFiles: !!body.files,
      })
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          success: false,
          step: "unknown",
        },
        { status: 400 },
      )
    }

    const {
      cppCode,
      githubUrl,
      step = "initial",
      buildLogs,
      existingTests,
      files,
      provider = { type: "ollama", model: "codellama:7b-code" },
    } = body

    console.log("Extracted request data:", {
      step,
      providerType: provider.type,
      hasFiles: !!files,
      codeLength: cppCode?.length || 0,
      hasGithubUrl: !!githubUrl,
    })

    // Validate required fields - updated logic
    if (step === "initial" && !cppCode && !files && !githubUrl) {
      console.error("No input provided for initial generation")
      return NextResponse.json(
        {
          error: "No C++ code, files, or GitHub URL provided for initial generation",
          success: false,
          step,
        },
        { status: 400 },
      )
    }

    // Handle batch processing for multiple files
    if (files && Array.isArray(files)) {
      console.log("Processing batch files:", files.length)
      return await processBatchFiles(files, step, provider)
    }

    let prompt = ""
    let yamlInstructions = ""

    try {
      switch (step) {
        case "initial":
          yamlInstructions = `
generation_rules:
  framework: "Google Test (gtest)"
  language: "C++17"
  requirements:
    - Generate comprehensive unit tests
    - Include setup and teardown methods
    - Test both positive and negative cases
    - Use descriptive test names
    - Include necessary headers
  structure:
    - Test fixtures for complex classes
    - Parameterized tests where applicable
    - Mock objects for dependencies
  coverage_targets:
    - All public methods
    - Edge cases and error conditions
    - Boundary value testing
`
          // Handle different input sources
          let sourceCode = ""
          if (cppCode) {
            sourceCode = cppCode
          } else if (githubUrl) {
            // Analyze the GitHub repository to get real code
            try {
              const analysisResponse = await fetch(`${request.nextUrl.origin}/api/analyze-github`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ githubUrl })
              })
              
              if (analysisResponse.ok) {
                const analysis = await analysisResponse.json()
                if (analysis.success && analysis.analysis.detailed_analysis) {
                  // Generate source code from the actual analysis
                  sourceCode = generateSourceCodeFromAnalysis(analysis.analysis)
                } else {
                  sourceCode = `// GitHub Repository: ${githubUrl}
// Analysis failed: ${analysis.error || 'Unknown error'}

#include <iostream>
#include <vector>
#include <string>

class ExampleClass {
public:
    void exampleMethod() {
        std::cout << "Example method from GitHub repo" << std::endl;
    }
};`
                }
              } else {
                sourceCode = `// GitHub Repository: ${githubUrl}
// Failed to analyze repository

#include <iostream>
#include <vector>
#include <string>

class ExampleClass {
public:
    void exampleMethod() {
        std::cout << "Example method from GitHub repo" << std::endl;
    }
};`
              }
            } catch (error) {
              console.error("GitHub analysis error:", error)
              sourceCode = `// GitHub Repository: ${githubUrl}
// Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}

#include <iostream>
#include <vector>
#include <string>

class ExampleClass {
public:
    void exampleMethod() {
        std::cout << "Example method from GitHub repo" << std::endl;
    }
};`
            }
          } else {
            sourceCode = "// No code provided"
          }

          prompt = `${yamlInstructions}\n\n${sourceCode}`
          break
        case "refine":
          prompt = `Refine the following C++ unit tests to remove duplicates and add relevant libraries.\n\n${cppCode}`
          break
        case "build-fix":
          prompt = `Fix any build errors in the following C++ code.\n\n${cppCode}\n\nBuild logs:\n${buildLogs}`
          break
        case "coverage":
          prompt = `Improve the following C++ unit tests to maximize code coverage.\n\n${cppCode}\n\nCoverage report:\n${body.coverageReport}`
          break
        default:
          prompt = cppCode || ""
      }
    } catch (promptError) {
      console.error("Prompt generation error:", promptError)
      return NextResponse.json({ error: "Failed to generate prompt", success: false, step }, { status: 500 })
    }

    // Call the appropriate LLM provider
    let result
    try {
      switch (provider.type) {
        case "openai":
          result = await generateTextWithProvider(prompt, provider)
          break
        case "ollama":
          result = await generateWithOllama(prompt, provider)
          break
        case "llamacpp":
          result = await generateWithLlamaCpp(prompt, provider)
          break
        case "textgen":
          result = await generateWithTextGen(prompt, provider)
          break
        default:
          result = generateMockTest(prompt, "Unknown provider type")
      }
    } catch (llmError) {
      console.error("LLM generation error:", llmError)
      return NextResponse.json({ error: "Failed to generate tests", success: false, step }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      step,
      generatedTests: result.text || result,
    })
  } catch (error) {
    console.error("API route error:", error)
    return NextResponse.json({ error: "Internal server error", success: false, step: "unknown" }, { status: 500 })
  }
}

// Function to handle batch processing
async function processBatchFiles(files: any[], step: string, provider: LLMProvider) {
  console.log("Processing batch files:", files.length)
  const results = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`)

    try {
      const prompt = generatePromptForFile(file, step)
      const result = await generateTextWithProvider(prompt, provider)
      const text = result.text || result

      results.push({
        fileName: file.name,
        content: file.content,
        generatedTests: text,
        success: true,
        progress: ((i + 1) / files.length) * 100,
      })
      console.log(`File ${file.name} processed successfully`)
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      results.push({
        fileName: file.name,
        error: `Failed to generate tests: ${error instanceof Error ? error.message : "Unknown error"}`,
        success: false,
        progress: ((i + 1) / files.length) * 100,
      })
    }
  }

  console.log("Batch processing completed")
  return NextResponse.json({
    batchResults: results,
    totalFiles: files.length,
    success: true,
  })
}

// Function to generate text with different providers
async function generateTextWithProvider(prompt: string, provider: LLMProvider) {
  console.log("generateTextWithProvider called with:", {
    providerType: provider.type,
    model: provider.model,
    endpoint: provider.endpoint,
    hasApiKey: !!provider.apiKey,
  })

  try {
    switch (provider.type) {
      case "openai":
        console.log("Using OpenAI provider")
        if (!provider.apiKey && !process.env.OPENAI_API_KEY) {
          console.warn("No OpenAI API key provided, using mock response")
          return { text: generateMockTest(prompt, "No OpenAI API key provided") }
        }

        try {
          return await generateText({
            model: openai(provider.model),
            prompt,
            maxTokens: 2000,
          })
        } catch (openaiError) {
          console.error("OpenAI generation failed:", openaiError)
          return {
            text: generateMockTest(
              prompt,
              `OpenAI Error: ${openaiError instanceof Error ? openaiError.message : "Unknown error"}`,
            ),
          }
        }

      case "ollama":
        console.log("Using Ollama provider")
        return await generateWithOllama(prompt, provider)

      case "llamacpp":
        console.log("Using LLaMA.cpp provider")
        return await generateWithLlamaCpp(prompt, provider)

      case "textgen":
        console.log("Using TextGen provider")
        return await generateWithTextGen(prompt, provider)

      default:
        console.warn(`Unsupported provider: ${provider.type}, using mock response`)
        return { text: generateMockTest(prompt, `Unsupported provider: ${provider.type}`) }
    }
  } catch (error) {
    console.error("Error in generateTextWithProvider:", error)

    // Always return a mock response instead of throwing
    return {
      text: generateMockTest(prompt, `Provider Error: ${error instanceof Error ? error.message : "Unknown error"}`),
    }
  }
}

// Mock test generator as fallback
function generateMockTest(prompt: string, reason?: string): string {
  const timestamp = new Date().toISOString()

  return `// Generated Unit Tests (Mock Response)
// Generated at: ${timestamp}
// Reason: ${reason || "Fallback response"}
#include <gtest/gtest.h>
#include <gmock/gmock.h>

// NOTE: This is a fallback test generated when the LLM provider is unavailable
// Please configure your LLM provider properly for AI-generated tests

// Test class for the provided C++ code
class GeneratedTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Setup test environment
        // TODO: Initialize test objects and dependencies
    }
    
    void TearDown() override {
        // Cleanup resources
        // TODO: Clean up any allocated resources
    }
};

// Basic functionality test
TEST_F(GeneratedTest, BasicFunctionality) {
    // Test basic functionality
    // TODO: Add specific tests for your C++ code
    EXPECT_TRUE(true) << "Replace with actual test logic";
    ASSERT_NE(nullptr, nullptr) << "Replace with actual assertions";
}

// Edge case test
TEST_F(GeneratedTest, EdgeCases) {
    // Test edge cases and boundary conditions
    // TODO: Add edge case tests
    EXPECT_FALSE(false) << "Replace with edge case logic";
}

// Error condition test
TEST_F(GeneratedTest, ErrorConditions) {
    // Test error conditions and exception handling
    // TODO: Add error condition tests
    EXPECT_THROW({
        // TODO: Add code that should throw exceptions
        throw std::runtime_error("Test exception");
    }, std::exception) << "Replace with actual error condition tests";
}

// Parameter validation test
TEST_F(GeneratedTest, ParameterValidation) {
    // Test parameter validation
    // TODO: Add parameter validation tests
    EXPECT_TRUE(true) << "Add parameter validation logic";
}

/*
INSTRUCTIONS FOR MANUAL COMPLETION:
1. Replace the TODO comments with actual test logic
2. Add specific test cases for your C++ functions/classes
3. Include proper assertions and expected values
4. Test both positive and negative scenarios
5. Add setup/teardown logic as needed

TROUBLESHOOTING:
${reason || "LLM provider unavailable"}

Prompt length: ${prompt.length} characters
*/`
}

// Ollama integration with better error handling and CORS support
async function generateWithOllama(prompt: string, provider: LLMProvider) {
  const endpoint = provider.endpoint || "http://localhost:11434"
  console.log("Connecting to Ollama at:", endpoint)

  try {
    // First, test if Ollama is reachable
    console.log("Testing Ollama health...")
    const healthCheck = await fetch(`${endpoint}/api/tags`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!healthCheck.ok) {
      throw new Error(`Ollama server not reachable at ${endpoint}. Status: ${healthCheck.status}`)
    }

    console.log("Ollama health check passed, generating text...")

    const response = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 2000,
          stop: ["</s>", "```\n\n", "Human:", "Assistant:"],
        },
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout for generation
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Ollama API error response:", errorText)
      throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.response) {
      console.error("Ollama returned empty response:", data)
      throw new Error("Ollama returned empty response")
    }

    console.log("Ollama generation successful, response length:", data.response.length)
    return { text: data.response }
  } catch (error) {
    console.error("Ollama error details:", error)

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(`Cannot connect to Ollama server at ${endpoint}. Please ensure:
1. Ollama is installed and running (ollama serve)
2. The server is accessible at ${endpoint}
3. No firewall is blocking the connection
4. Try using 127.0.0.1 instead of localhost`)
    }

    if (error.name === "AbortError") {
      throw new Error("Ollama request timed out. The model might be too large or the server is overloaded.")
    }

    throw new Error(`Ollama connection failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// LLaMA.cpp integration with better error handling
async function generateWithLlamaCpp(prompt: string, provider: LLMProvider) {
  const endpoint = provider.endpoint || "http://localhost:8080"
  console.log("Connecting to LLaMA.cpp at:", endpoint)

  try {
    const response = await fetch(`${endpoint}/completion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt,
        temperature: 0.3,
        top_p: 0.9,
        n_predict: 2000,
        stop: ["</s>", "Human:", "Assistant:"],
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`LLaMA.cpp API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    return { text: data.content || "No response from LLaMA.cpp" }
  } catch (error) {
    console.error("LLaMA.cpp error:", error)
    throw new Error(`LLaMA.cpp connection failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Text Generation WebUI integration with better error handling
async function generateWithTextGen(prompt: string, provider: LLMProvider) {
  const endpoint = provider.endpoint || "http://localhost:5000"
  console.log("Connecting to TextGen at:", endpoint)

  try {
    const response = await fetch(`${endpoint}/api/v1/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 2000,
        temperature: 0.3,
        top_p: 0.9,
        stop: ["</s>", "Human:", "Assistant:"],
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`TextGen API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    return { text: data.choices?.[0]?.text || "No response from TextGen" }
  } catch (error) {
    console.error("TextGen error:", error)
    throw new Error(`TextGen connection failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

function generatePromptForFile(file: any, step: string) {
  const yamlInstructions = getYamlInstructionsForStep(step)

  return `Generate comprehensive unit tests for the following C++ code using Google Test framework.

YAML Instructions:
${yamlInstructions}

File: ${file.name}
C++ Code:
${file.content}

Generate complete, compilable unit tests with proper includes and test structure.`
}

function generateSourceCodeFromAnalysis(analysis: any): string {
  let sourceCode = `// GitHub Repository Analysis Results
// Files analyzed: ${analysis.files_analyzed}
// Total classes: ${analysis.summary?.total_classes || 0}
// Total methods: ${analysis.summary?.total_methods || 0}

`

  // Add includes
  if (analysis.summary?.unique_includes?.length > 0) {
    sourceCode += "// Required includes:\n"
    analysis.summary.unique_includes.forEach((include: string) => {
      sourceCode += `#include <${include}>\n`
    })
    sourceCode += "\n"
  }

  // Add namespaces
  if (analysis.summary?.unique_namespaces?.length > 0) {
    sourceCode += "// Namespaces found:\n"
    analysis.summary.unique_namespaces.forEach((ns: string) => {
      sourceCode += `namespace ${ns} {\n`
    })
    sourceCode += "\n"
  }

  // Generate class definitions from analysis
  if (analysis.detailed_analysis?.length > 0) {
    sourceCode += "// Classes found in repository:\n\n"
    
    analysis.detailed_analysis.forEach((fileAnalysis: any) => {
      if (fileAnalysis.classes?.length > 0) {
        sourceCode += `// From file: ${fileAnalysis.file_path}\n`
        
        fileAnalysis.classes.forEach((cls: any) => {
          sourceCode += `class ${cls.name}`
          if (cls.base_class) {
            sourceCode += ` : public ${cls.base_class}`
          }
          sourceCode += " {\n"
          
          // Add public methods
          if (cls.methods?.length > 0) {
            sourceCode += "public:\n"
            cls.methods.forEach((method: any) => {
              sourceCode += `    ${method.return_type} ${method.name}();\n`
            })
          }
          
          // Add constructors
          if (cls.constructors?.length > 0) {
            sourceCode += "public:\n"
            cls.constructors.forEach((ctor: any) => {
              sourceCode += `    ${ctor.name}();\n`
            })
          }
          
          // Add destructors
          if (cls.destructors?.length > 0) {
            sourceCode += "public:\n"
            cls.destructors.forEach((dtor: any) => {
              sourceCode += `    ${dtor.name}();\n`
            })
          }
          
          // Add member variables
          if (cls.members?.length > 0) {
            sourceCode += "private:\n"
            cls.members.forEach((member: any) => {
              sourceCode += `    ${member.type} ${member.name};\n`
            })
          }
          
          sourceCode += "};\n\n"
        })
      }
    })
  }

  // Add standalone functions
  if (analysis.detailed_analysis?.length > 0) {
    sourceCode += "// Standalone functions:\n"
    analysis.detailed_analysis.forEach((fileAnalysis: any) => {
      if (fileAnalysis.functions?.length > 0) {
        sourceCode += `// From file: ${fileAnalysis.file_path}\n`
        fileAnalysis.functions.forEach((func: any) => {
          sourceCode += `${func.return_type} ${func.name}();\n`
        })
      }
    })
  }

  return sourceCode
}

function getYamlInstructionsForStep(step: string): string {
  switch (step) {
    case "initial":
      return `
generation_rules:
  framework: "Google Test (gtest)"
  language: "C++17"
  requirements:
    - Generate comprehensive unit tests
    - Include setup and teardown methods
    - Test both positive and negative cases
    - Use descriptive test names
    - Include necessary headers`
    case "refine":
      return `
refinement_rules:
  duplicate_removal:
    - Remove identical test cases
    - Merge similar tests with different parameters
  library_management:
    - Add missing include statements
    - Ensure proper Google Test setup`
    case "fix_build":
      return `
build_fix_rules:
  error_analysis:
    - Identify compilation errors
    - Fix missing includes
    - Resolve linking issues`
    case "improve_coverage":
      return `
coverage_improvement_rules:
  analysis:
    - Identify uncovered code paths
    - Find missing edge cases
  enhancement:
    - Add tests for uncovered lines
    - Include boundary value tests`
    default:
      return ""
  }
}
