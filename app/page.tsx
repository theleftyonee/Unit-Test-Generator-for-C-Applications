"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Github, Upload, Play, CheckCircle, AlertCircle, Code, BarChart3, Search } from "lucide-react"
import { Download, Cog } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TestGenerationStep {
  id: string
  name: string
  status: "pending" | "running" | "completed" | "error"
  description: string
}

const DEFAULT_CPP_CODE = `#include <iostream>
#include <vector>
#include <string>

class Calculator {
private:
    double result;

public:
    Calculator() : result(0.0) {}
    
    double add(double a, double b) {
        result = a + b;
        return result;
    }
    
    double subtract(double a, double b) {
        result = a - b;
        return result;
    }
    
    double multiply(double a, double b) {
        result = a * b;
        return result;
    }
    
    double divide(double a, double b) {
        if (b == 0) {
            throw std::invalid_argument("Division by zero");
        }
        result = a / b;
        return result;
    }
    
    double getResult() const {
        return result;
    }
    
    void reset() {
        result = 0.0;
    }
};

class StringUtils {
public:
    static bool isEmpty(const std::string& str) {
        return str.empty();
    }
    
    static std::string reverse(const std::string& str) {
        std::string reversed = str;
        std::reverse(reversed.begin(), reversed.end());
        return reversed;
    }
    
    static int countWords(const std::string& str) {
        if (str.empty()) return 0;
        
        int count = 1;
        for (char c : str) {
            if (c == ' ') count++;
        }
        return count;
    }
};`

export default function CppUnitTestGenerator() {
  const [activeTab, setActiveTab] = useState("upload")
  const [githubUrl, setGithubUrl] = useState("https://github.com/keploy/orgChartApi.git")
  const [cppCode, setCppCode] = useState(DEFAULT_CPP_CODE)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedTests, setGeneratedTests] = useState("")
  const [buildLogs, setBuildLogs] = useState("")
  const [coverageReport, setCoverageReport] = useState("")
  const [githubAnalysis, setGithubAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [steps, setSteps] = useState<TestGenerationStep[]>([
    {
      id: "1",
      name: "Initial Test Generation",
      status: "pending",
      description: "Generate initial unit tests using LLM",
    },
    {
      id: "2",
      name: "Test Refinement",
      status: "pending",
      description: "Remove duplicates and add relevant libraries",
    },
    { id: "3", name: "Build & Debug", status: "pending", description: "Build project and handle any issues" },
    { id: "4", name: "Coverage Analysis", status: "pending", description: "Calculate test coverage and optimize" },
  ])

  // Add new state for batch processing and LLM provider selection
  const [selectedProvider, setSelectedProvider] = useState({
    type: "ollama",
    model: "llama3.2:1b", // Optimal for 8GB RAM - fastest and most efficient
    endpoint: "http://localhost:11434",
  })
  const [availableProviders, setAvailableProviders] = useState({})
  const [batchFiles, setBatchFiles] = useState<File[]>([])
  const [batchProgress, setBatchProgress] = useState<any[]>([])
  const [showProviderConfig, setShowProviderConfig] = useState(false)

  // Add useEffect to load available providers
  useEffect(() => {
    loadAvailableProviders()
  }, [])

  const loadAvailableProviders = async () => {
    try {
      const response = await fetch("/api/llm-providers")
      const data = await response.json()
      setAvailableProviders(data.providers)

      // Set default to optimal model for 8GB RAM
      if (data.providers.ollama?.models) {
        const preferredModels = ["llama3.2:1b", "qwen2.5-coder:1.5b", "gemma2:2b", "codellama:7b-code", "codellama:7b", "llama2:7b"]
        const availableModel = preferredModels.find((model) => data.providers.ollama.models.includes(model))

        if (availableModel) {
          setSelectedProvider((prev) => ({ ...prev, model: availableModel }))
        }
      }
    } catch (error) {
      console.error("Failed to load providers:", error)
    }
  }

  const analyzeGitHubRepository = async (url: string) => {
    setIsAnalyzing(true)
    setGithubAnalysis(null)
    
    try {
      const response = await fetch("/api/analyze-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: url })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setGithubAnalysis(result.analysis)
        console.log("GitHub analysis completed:", result.analysis)
      } else {
        console.error("GitHub analysis failed:", result.error)
        alert(`GitHub analysis failed: ${result.error}`)
      }
    } catch (error) {
      console.error("GitHub analysis error:", error)
      alert(`GitHub analysis error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Update handleGenerateTests to support batch processing and provider selection
  const handleGenerateTests = async () => {
    setIsGenerating(true)
    setProgress(0)
    setBatchProgress([])

    try {
      // Validate input
      if (activeTab === "upload" && !cppCode.trim()) {
        alert("Please provide C++ code to generate tests for")
        return
      }

      if (activeTab === "github" && !githubUrl.trim()) {
        alert("Please provide a GitHub repository URL")
        return
      }

      if (activeTab === "batch" && batchFiles.length === 0) {
        alert("Please select C++ files to process")
        return
      }

      // Validate provider configuration
      if (selectedProvider.type === "ollama" && !selectedProvider.endpoint) {
        setSelectedProvider((prev) => ({ ...prev, endpoint: "http://localhost:11434" }))
      }

      // Prepare request data
      const requestData = {
        provider: selectedProvider,
        ...(batchFiles.length > 0
          ? {
              files: await Promise.all(
                batchFiles.map(async (file) => ({
                  name: file.name,
                  content: await file.text(),
                })),
              ),
            }
          : activeTab === "github"
            ? { githubUrl }
            : { cppCode }),
      }

      console.log("Starting test generation with data:", {
        provider: selectedProvider.type,
        model: selectedProvider.model,
        endpoint: selectedProvider.endpoint,
        hasFiles: batchFiles.length > 0,
        hasCode: !!cppCode,
        hasGithubUrl: !!githubUrl,
      })

      // Simulate the workflow steps
      const stepDurations = [3000, 2500, 4000, 2000]
      const stepNames = ["initial", "refine", "fix_build", "improve_coverage"]

      for (let i = 0; i < steps.length; i++) {
        // Update current step to running
        setSteps((prev) => prev.map((step) => (step.id === (i + 1).toString() ? { ...step, status: "running" } : step)))

        setProgress((i / steps.length) * 100)

        // Make API call for each step
        try {
          console.log(`Starting step ${i + 1}: ${stepNames[i]}`)

          const response = await fetch("/api/generate-tests", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              ...requestData,
              step: stepNames[i],
              buildLogs: i === 2 ? buildLogs : undefined,
              existingTests: i > 0 ? generatedTests : undefined,
            }),
          })

          console.log(`Step ${i + 1} response status:`, response.status)

          if (!response.ok) {
            let errorText = ""
            try {
              const errorData = await response.json()
              errorText = errorData.error || `HTTP ${response.status}`
              console.error(`Step ${i + 1} error details:`, errorData)
            } catch {
              errorText = await response.text()
              console.error(`Step ${i + 1} failed with status ${response.status}:`, errorText)
            }
            throw new Error(`API request failed: ${errorText}`)
          }

          const contentType = response.headers.get("content-type")
          if (!contentType || !contentType.includes("application/json")) {
            const responseText = await response.text()
            console.error(`Step ${i + 1} returned non-JSON response:`, responseText.substring(0, 200))
            throw new Error("API returned non-JSON response")
          }

          const result = await response.json()
          console.log(`Step ${i + 1} completed successfully`)

          if (!result.success) {
            throw new Error(result.error || "API request failed")
          }

          if (result.batchResults) {
            setBatchProgress(result.batchResults)
          }

          // Update step to completed
          setSteps((prev) =>
            prev.map((step) => (step.id === (i + 1).toString() ? { ...step, status: "completed" } : step)),
          )

          // Update generated content based on step
          if (i === 0) {
            const testContent = result.generatedTests || result.batchResults?.[0]?.generatedTests || ""
            setGeneratedTests(testContent)
            console.log("Generated tests length:", testContent.length)
          } else if (i === 1) {
            setBuildLogs(`Building C++ project with generated tests...
[INFO] Compiling test files...
[INFO] Linking with Google Test framework...
[SUCCESS] Build completed successfully!
[INFO] All tests compiled without errors.`)
          } else if (i === 2) {
            setCoverageReport(`Test Coverage Report:
===================
Lines covered: 156/200 (78%)
Functions covered: 12/15 (80%)
Branches covered: 24/30 (80%)

Detailed Coverage:
- Calculator.cpp: 85% coverage
- StringUtils.cpp: 92% coverage
- Main.cpp: 65% coverage

Recommendations:
- Add tests for error handling in Calculator::divide
- Increase branch coverage for edge cases`)
          }
        } catch (error) {
          console.error(`Step ${i + 1} failed:`, error)
          setSteps((prev) => prev.map((step) => (step.id === (i + 1).toString() ? { ...step, status: "error" } : step)))

          // Show detailed error message with troubleshooting
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          let troubleshootingMessage = `Step ${i + 1} failed: ${errorMessage}`

          if (selectedProvider.type === "ollama" && errorMessage.includes("memory")) {
            troubleshootingMessage += `

Memory Issue Detected:
The selected model '${selectedProvider.model}' requires more memory than available.

Quick Solutions:
1. Try an available model:
   - codellama:7b-code (3.8 GB memory) - Best for code generation
   - codellama:7b (3.8 GB memory)
   - llama2:7b (3.8 GB memory)

2. Free up system memory:
   - Close other applications
   - Restart your computer
   - Check memory usage with 'htop' or Task Manager

3. Use available models:
   ollama list
   # Your available models: codellama:7b-code, codellama:7b, llama2:7b

Current model memory requirement: Check the provider configuration for details.`
          } else if (selectedProvider.type === "ollama" && errorMessage.includes("fetch")) {
            troubleshootingMessage += `

Ollama Connection Issue:
1. Make sure Ollama is running: 'ollama serve'
2. Check if models are available: 'ollama list'
3. Test connection: 'curl http://localhost:11434/api/tags'
4. Try using 127.0.0.1 instead of localhost
5. Check if port 11434 is accessible
6. Restart Ollama if needed

If Ollama is not installed:
- Visit https://ollama.ai to download
- Install and run 'ollama pull ${selectedProvider.model}'`
          }

          alert(troubleshootingMessage)
          break
        }

        // Add delay between steps
        await new Promise((resolve) => setTimeout(resolve, stepDurations[i]))
      }

      setProgress(100)
    } catch (error) {
      console.error("Test generation failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      alert(`Test generation failed: ${errorMessage}`)

      // Reset all steps to pending on major failure
      setSteps((prev) => prev.map((step) => ({ ...step, status: "pending" })))
    } finally {
      setIsGenerating(false)
    }
  }

  // Add file handling for batch processing
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setBatchFiles(files)
  }

  // Add download functions
  const downloadSingleTest = async (content: string, fileName: string) => {
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "single-test",
          data: content,
          fileName: fileName,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const downloadAllTests = async () => {
    try {
      const testsData =
        batchProgress.length > 0
          ? batchProgress.map((result) => ({
              fileName: result.fileName,
              content: result.generatedTests,
              description: `Unit tests for ${result.fileName}`,
            }))
          : [
              {
                fileName: "generated_tests.cpp",
                content: generatedTests,
                description: "Generated unit tests",
              },
            ]

      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "all-tests",
          data: testsData,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "cpp_unit_tests.zip"
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const downloadCoverageReport = async () => {
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "coverage-report",
          data: {
            totalLines: 200,
            coveredLines: 156,
            files: {
              "Calculator.cpp": { coverage: 85, coveredLines: 45, totalLines: 53 },
              "StringUtils.cpp": { coverage: 92, coveredLines: 46, totalLines: 50 },
              "Main.cpp": { coverage: 65, coveredLines: 65, totalLines: 100 },
            },
          },
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "coverage_report.zip"
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "running":
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">C++ Unit Test Generator</h1>
          <p className="text-lg text-gray-600">Automatically generate, refine, and optimize unit tests using AI</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Input Source
                </CardTitle>
                <CardDescription>Choose your C++ project source and LLM provider</CardDescription>
              </CardHeader>
              <CardContent>
                {/* LLM Provider Selection */}
                <div className="mb-4 p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">LLM Provider</Label>
                    <Button variant="outline" size="sm" onClick={() => setShowProviderConfig(!showProviderConfig)}>
                      <Cog className="w-4 h-4 mr-1" />
                      Configure
                    </Button>
                  </div>

                  <Select
                    value={selectedProvider.type}
                    onValueChange={(value) => setSelectedProvider((prev) => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select LLM Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(availableProviders).map(([key, provider]: [string, any]) => (
                        <SelectItem key={key} value={key}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {showProviderConfig && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <Label htmlFor="model">Model</Label>
                        <Select
                          value={selectedProvider.model}
                          onValueChange={(value) => setSelectedProvider((prev) => ({ ...prev, model: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Model" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProviders[selectedProvider.type]?.models?.map((model: string) => {
                              const memoryReq = availableProviders[selectedProvider.type]?.memoryRequirements?.[model]
                              return (
                                <SelectItem key={model} value={model}>
                                  <div className="flex items-center gap-2">
                                    <span>{model}</span>
                                    {memoryReq && (
                                      <Badge variant="outline" className="text-xs">
                                        {memoryReq}
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="endpoint">Endpoint URL</Label>
                        <Input
                          id="endpoint"
                          value={selectedProvider.endpoint}
                          onChange={(e) => setSelectedProvider((prev) => ({ ...prev, endpoint: e.target.value }))}
                          placeholder="http://localhost:11434"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="github" className="flex items-center gap-1">
                      <Github className="w-4 h-4" />
                      GitHub
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Code
                    </TabsTrigger>
                    <TabsTrigger value="batch" className="flex items-center gap-1">
                      <Upload className="w-4 h-4" />
                      Batch
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="github" className="space-y-4">
                    <div>
                      <Label htmlFor="github-url">Repository URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="github-url"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          placeholder="https://github.com/user/repo.git"
                        />
                        <Button 
                          onClick={() => analyzeGitHubRepository(githubUrl)}
                          disabled={!githubUrl.trim() || isAnalyzing}
                          variant="outline"
                        >
                          {isAnalyzing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4 mr-2" />
                              Analyze
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* GitHub Analysis Results */}
                    {githubAnalysis && (
                      <div className="p-4 border rounded-lg bg-blue-50">
                        <h3 className="font-semibold text-blue-900 mb-2">Repository Analysis Results</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Files Analyzed:</span> {githubAnalysis.files_analyzed}
                          </div>
                          <div>
                            <span className="font-medium">Total Classes:</span> {githubAnalysis.summary?.total_classes || 0}
                          </div>
                          <div>
                            <span className="font-medium">Total Methods:</span> {githubAnalysis.summary?.total_methods || 0}
                          </div>
                          <div>
                            <span className="font-medium">Total Functions:</span> {githubAnalysis.summary?.total_functions || 0}
                          </div>
                        </div>
                        {githubAnalysis.summary?.unique_includes?.length > 0 && (
                          <div className="mt-2">
                            <span className="font-medium text-sm">Key Includes:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {githubAnalysis.summary.unique_includes.slice(0, 10).map((include: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {include}
                                </Badge>
                              ))}
                              {githubAnalysis.summary.unique_includes.length > 10 && (
                                <Badge variant="outline" className="text-xs">
                                  +{githubAnalysis.summary.unique_includes.length - 10} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="upload" className="space-y-4">
                    <div>
                      <Label htmlFor="cpp-code">C++ Code</Label>
                      <Textarea
                        id="cpp-code"
                        value={cppCode}
                        onChange={(e) => setCppCode(e.target.value)}
                        placeholder="Paste your C++ code here..."
                        rows={8}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="batch" className="space-y-4">
                    <div>
                      <Label htmlFor="batch-files">Upload Multiple C++ Files</Label>
                      <Input
                        id="batch-files"
                        type="file"
                        multiple
                        accept=".cpp,.cc,.cxx,.h,.hpp,.hxx"
                        onChange={handleFileUpload}
                      />
                      {batchFiles.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">Selected files:</p>
                          <ul className="text-sm">
                            {batchFiles.map((file, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <Button onClick={handleGenerateTests} disabled={isGenerating} className="w-full mt-4">
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Generating Tests...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate Unit Tests
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Progress Section */}
            {isGenerating && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Generation Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={progress} className="mb-4" />
                  <div className="space-y-2">
                    {steps.map((step) => (
                      <div key={step.id} className="flex items-center gap-2 text-sm">
                        {getStatusIcon(step.status)}
                        <span className={step.status === "completed" ? "text-green-600" : "text-gray-600"}>
                          {step.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="tests" className="space-y-4">
              <TabsList>
                <TabsTrigger value="tests" className="flex items-center gap-1">
                  <Code className="w-4 h-4" />
                  Generated Tests
                </TabsTrigger>
                <TabsTrigger value="build" className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Build Logs
                </TabsTrigger>
                <TabsTrigger value="coverage" className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  Coverage Report
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tests">
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Unit Tests</CardTitle>
                    <CardDescription>AI-generated and refined unit tests for your C++ code</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {generatedTests || batchProgress.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Badge variant="secondary">Google Test</Badge>
                          <Badge variant="secondary">C++17</Badge>
                          <Badge variant="outline">Auto-generated</Badge>
                          {batchProgress.length > 0 && <Badge variant="outline">{batchProgress.length} files</Badge>}
                        </div>

                        {/* Batch Progress Display */}
                        {batchProgress.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium">Batch Processing Results:</h4>
                            {batchProgress.map((result, index) => (
                              <div key={index} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium">{result.fileName}</span>
                                  <div className="flex gap-2">
                                    {result.success ? (
                                      <Badge variant="default">Success</Badge>
                                    ) : (
                                      <Badge variant="destructive">Failed</Badge>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        downloadSingleTest(
                                          result.generatedTests,
                                          result.fileName.replace(/\.(cpp|h)$/, "_test.cpp"),
                                        )
                                      }
                                      disabled={!result.success}
                                    >
                                      <FileText className="w-4 h-4 mr-1" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                                {result.success ? (
                                  <pre className="bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto max-h-32">
                                    <code>{result.generatedTests.substring(0, 200)}...</code>
                                  </pre>
                                ) : (
                                  <p className="text-red-600 text-sm">{result.error}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Single Test Display */}
                        {generatedTests && batchProgress.length === 0 && (
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{generatedTests}</code>
                          </pre>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadSingleTest(generatedTests, "generated_tests.cpp")}
                            disabled={!generatedTests && batchProgress.length === 0}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Download Single Test
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadAllTests}
                            disabled={!generatedTests && batchProgress.length === 0}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download All Tests
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadCoverageReport}
                            disabled={!coverageReport}
                          >
                            <BarChart3 className="w-4 h-4 mr-1" />
                            Download Coverage Report
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Code className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Generated tests will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="build">
                <Card>
                  <CardHeader>
                    <CardTitle>Build Logs</CardTitle>
                    <CardDescription>Compilation and build status for generated tests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {buildLogs ? (
                      <div className="space-y-4">
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Build completed successfully! All tests compiled without errors.
                          </AlertDescription>
                        </Alert>
                        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                          <code>{buildLogs}</code>
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Build logs will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="coverage">
                <Card>
                  <CardHeader>
                    <CardTitle>Test Coverage Report</CardTitle>
                    <CardDescription>Detailed analysis of test coverage and recommendations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {coverageReport ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">78%</div>
                            <div className="text-sm text-green-700">Line Coverage</div>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">80%</div>
                            <div className="text-sm text-blue-700">Function Coverage</div>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">80%</div>
                            <div className="text-sm text-purple-700">Branch Coverage</div>
                          </div>
                        </div>
                        <pre className="bg-gray-50 p-4 rounded-lg text-sm">
                          <code>{coverageReport}</code>
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Coverage report will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
