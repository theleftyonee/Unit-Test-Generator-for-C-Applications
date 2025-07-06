import { NextResponse } from "next/server"

export async function GET() {
  const providers = {
    ollama: {
      name: "Ollama (Local)",
      endpoint: "http://localhost:11434",
      requiresApiKey: false,
      models: [
        "codellama:7b-instruct",
        "codellama:7b-code",
        "llama3.2:3b",
        "llama3.2:1b",
        "qwen2.5-coder:1.5b",
        "qwen2.5-coder:3b",
        "qwen2.5-coder:7b",
        "deepseek-coder:1.3b",
        "deepseek-coder:6.7b",
        "starcoder2:3b",
        "starcoder2:7b",
        "phi3:mini",
        "gemma2:2b",
      ],
      memoryRequirements: {
        "llama3.2:1b": "1.3 GB",
        "qwen2.5-coder:1.5b": "1.8 GB",
        "gemma2:2b": "2.5 GB",
        "llama3.2:3b": "3.2 GB",
        "deepseek-coder:1.3b": "1.5 GB",
        "phi3:mini": "2.3 GB",
        "qwen2.5-coder:3b": "3.5 GB",
        "starcoder2:3b": "3.8 GB",
        "deepseek-coder:6.7b": "6.2 GB",
        "codellama:7b-code": "7.2 GB",
        "codellama:7b-instruct": "7.2 GB",
        "qwen2.5-coder:7b": "7.5 GB",
        "starcoder2:7b": "7.8 GB",
      },
      description: "Local Ollama server with various code-focused models. Smaller models use less memory.",
    },
    llamacpp: {
      name: "LLaMA.cpp (Local)",
      endpoint: "http://localhost:8080",
      requiresApiKey: false,
      models: ["custom-model"],
      description: "Local LLaMA.cpp server with custom GGUF models",
    },
    textgen: {
      name: "Text Generation WebUI",
      endpoint: "http://localhost:5000",
      requiresApiKey: false,
      models: ["custom-model"],
      description: "Local Text Generation WebUI server",
    },
  }

  return NextResponse.json({ providers })
}

export async function POST(request: Request) {
  try {
    const { provider, endpoint, model } = await request.json()

    // Test connection based on provider type
    switch (provider) {
      case "ollama":
        return await testOllamaConnection(endpoint || "http://localhost:11434", model)
      case "llamacpp":
        return await testLlamaCppConnection(endpoint || "http://localhost:8080")
      case "textgen":
        return await testTextGenConnection(endpoint || "http://localhost:5000")
      default:
        return NextResponse.json({ connected: false, error: "Unknown provider" })
    }
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    })
  }
}

async function testOllamaConnection(endpoint: string, model?: string) {
  try {
    // Test basic connectivity
    const response = await fetch(`${endpoint}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return NextResponse.json({
        connected: false,
        error: `Ollama server not reachable at ${endpoint}`,
      })
    }

    const data = await response.json()
    const availableModels = data.models?.map((m: any) => m.name) || []

    // If a specific model is provided, test it
    if (model && availableModels.length > 0) {
      const modelExists = availableModels.some((m: string) => m.includes(model.split(":")[0]))

      if (!modelExists) {
        return NextResponse.json({
          connected: true,
          availableModels,
          warning: `Model '${model}' not found. Available models: ${availableModels.join(", ")}`,
        })
      }

      // Test model generation with a simple prompt
      try {
        const testResponse = await fetch(`${endpoint}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model,
            prompt: "Hello",
            stream: false,
            options: { num_predict: 5 },
          }),
          signal: AbortSignal.timeout(10000),
        })

        if (!testResponse.ok) {
          const errorText = await testResponse.text()
          let errorMessage = `Model test failed: ${testResponse.status}`

          if (errorText.includes("not enough memory")) {
            errorMessage = `Insufficient memory for model '${model}'. Try a smaller model like 'codellama:7b-code' or 'llama2:7b'`
          } else if (errorText.includes("model not found")) {
            errorMessage = `Model '${model}' not found. Available models: codellama:7b-code, codellama:7b, llama2:7b. Run 'ollama pull ${model}' to download it.`
          }

          return NextResponse.json({
            connected: true,
            availableModels,
            error: errorMessage,
          })
        }
      } catch (modelError) {
        return NextResponse.json({
          connected: true,
          availableModels,
          error: `Model '${model}' test failed. Try a smaller model or check memory usage.`,
        })
      }
    }

    return NextResponse.json({
      connected: true,
      availableModels,
      message:
        availableModels.length > 0
          ? `Connected successfully. Found ${availableModels.length} models.`
          : "Connected but no models found. Run 'ollama pull <model>' to download models.",
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: `Cannot connect to Ollama at ${endpoint}. Make sure Ollama is running with 'ollama serve'`,
    })
  }
}

async function testLlamaCppConnection(endpoint: string) {
  try {
    const response = await fetch(`${endpoint}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    })

    return NextResponse.json({
      connected: response.ok,
      message: response.ok ? "LLaMA.cpp server is running" : "LLaMA.cpp server not responding",
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: `Cannot connect to LLaMA.cpp at ${endpoint}`,
    })
  }
}

async function testTextGenConnection(endpoint: string) {
  try {
    const response = await fetch(`${endpoint}/api/v1/models`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    })

    const availableModels = response.ok ? ["custom-model"] : []

    return NextResponse.json({
      connected: response.ok,
      availableModels,
      message: response.ok ? "Text Generation WebUI is running" : "Text Generation WebUI not responding",
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: `Cannot connect to Text Generation WebUI at ${endpoint}`,
    })
  }
}
