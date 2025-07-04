import { type NextRequest, NextResponse } from "next/server"

// LLM Provider configurations
export const LLM_PROVIDERS = {
  openai: {
    name: "OpenAI GPT-4",
    endpoint: "https://api.openai.com/v1",
    requiresApiKey: true,
    models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  ollama: {
    name: "Ollama (Local)",
    endpoint: "http://localhost:11434",
    requiresApiKey: false,
    models: ["llama2", "codellama", "mistral", "neural-chat"],
  },
  llamacpp: {
    name: "LLaMA.cpp Server",
    endpoint: "http://localhost:8080",
    requiresApiKey: false,
    models: ["llama-2-7b", "llama-2-13b", "code-llama"],
  },
  textgen: {
    name: "Text Generation WebUI",
    endpoint: "http://localhost:5000",
    requiresApiKey: false,
    models: ["auto"],
  },
}

export async function GET() {
  try {
    return NextResponse.json({
      providers: LLM_PROVIDERS,
      success: true,
    })
  } catch (error) {
    console.error("Error getting providers:", error)
    return NextResponse.json(
      {
        error: "Failed to get providers",
        success: false,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, endpoint, model } = body

    console.log("Testing connection for provider:", provider)

    // Test connection to the LLM provider
    let testResult = false
    let availableModels: string[] = []
    let errorMessage = ""

    try {
      switch (provider) {
        case "ollama":
          testResult = await testOllamaConnection(endpoint)
          if (testResult) {
            availableModels = await getOllamaModels(endpoint)
          }
          break

        case "llamacpp":
          testResult = await testLlamaCppConnection(endpoint)
          break

        case "textgen":
          testResult = await testTextGenConnection(endpoint)
          break

        case "openai":
          testResult = true // OpenAI doesn't need testing here
          break

        default:
          testResult = false
          errorMessage = `Unsupported provider: ${provider}`
      }
    } catch (error) {
      console.error("Connection test error:", error)
      testResult = false
      errorMessage = error instanceof Error ? error.message : "Connection test failed"
    }

    return NextResponse.json({
      connected: testResult,
      availableModels,
      error: errorMessage,
      success: true,
    })
  } catch (error) {
    console.error("Error testing connection:", error)
    return NextResponse.json(
      {
        connected: false,
        error: "Failed to test LLM connection",
        success: false,
      },
      { status: 500 },
    )
  }
}

async function testOllamaConnection(endpoint: string): Promise<boolean> {
  try {
    const url = `${endpoint}/api/tags`
    console.log("Testing Ollama connection to:", url)

    // Try multiple endpoints in case of localhost issues
    const endpoints = [
      endpoint,
      endpoint.replace("localhost", "127.0.0.1"),
      endpoint.replace("127.0.0.1", "localhost"),
    ].filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates

    for (const testEndpoint of endpoints) {
      try {
        console.log("Trying endpoint:", testEndpoint)

        const response = await fetch(`${testEndpoint}/api/tags`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        if (response.ok) {
          console.log("Ollama connection successful at:", testEndpoint)
          return true
        } else {
          console.log("Ollama connection failed at:", testEndpoint, "Status:", response.status)
        }
      } catch (endpointError) {
        console.log("Failed to connect to:", testEndpoint, endpointError)
        continue
      }
    }

    return false
  } catch (error) {
    console.error("Ollama connection test failed:", error)
    return false
  }
}

async function getOllamaModels(endpoint: string): Promise<string[]> {
  try {
    // Try the same endpoint variations as in connection test
    const endpoints = [
      endpoint,
      endpoint.replace("localhost", "127.0.0.1"),
      endpoint.replace("127.0.0.1", "localhost"),
    ].filter((value, index, self) => self.indexOf(value) === index)

    for (const testEndpoint of endpoints) {
      try {
        const response = await fetch(`${testEndpoint}/api/tags`, {
          signal: AbortSignal.timeout(5000),
        })

        if (response.ok) {
          const data = await response.json()
          const models = data.models?.map((model: any) => model.name) || []
          console.log("Found Ollama models:", models)
          return models
        }
      } catch (error) {
        continue
      }
    }

    return []
  } catch (error) {
    console.error("Failed to get Ollama models:", error)
    return []
  }
}

async function testLlamaCppConnection(endpoint: string): Promise<boolean> {
  try {
    const url = `${endpoint}/health`
    console.log("Testing LLaMA.cpp connection to:", url)

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    })

    const result = response.ok
    console.log("LLaMA.cpp connection test result:", result)
    return result
  } catch (error) {
    console.error("LLaMA.cpp connection test failed:", error)
    return false
  }
}

async function testTextGenConnection(endpoint: string): Promise<boolean> {
  try {
    const url = `${endpoint}/api/v1/models`
    console.log("Testing TextGen connection to:", url)

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    })

    const result = response.ok
    console.log("TextGen connection test result:", result)
    return result
  } catch (error) {
    console.error("TextGen connection test failed:", error)
    return false
  }
}
