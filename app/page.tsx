"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Github, Upload, Play, CheckCircle, AlertCircle, Code, BarChart3 } from "lucide-react"

interface TestGenerationStep {
  id: string
  name: string
  status: "pending" | "running" | "completed" | "error"
  description: string
}

export default function CppUnitTestGenerator() {
  const [activeTab, setActiveTab] = useState("upload")
  const [githubUrl, setGithubUrl] = useState("https://github.com/keploy/orgChartApi.git")
  const [cppCode, setCppCode] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedTests, setGeneratedTests] = useState("")
  const [buildLogs, setBuildLogs] = useState("")
  const [coverageReport, setCoverageReport] = useState("")

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

  const handleGenerateTests = async () => {
    setIsGenerating(true)
    setProgress(0)

    // Simulate the workflow steps
    const stepDurations = [3000, 2500, 4000, 2000]

    for (let i = 0; i < steps.length; i++) {
      // Update current step to running
      setSteps((prev) => prev.map((step) => (step.id === (i + 1).toString() ? { ...step, status: "running" } : step)))

      setProgress((i / steps.length) * 100)

      // Simulate API call for each step
      await new Promise((resolve) => setTimeout(resolve, stepDurations[i]))

      // Update step to completed
      setSteps((prev) => prev.map((step) => (step.id === (i + 1).toString() ? { ...step, status: "completed" } : step)))

      // Simulate generated content for each step
      if (i === 0) {
        setGeneratedTests(`// Generated Unit Tests for orgChartApi
#include <gtest/gtest.h>
#include "../controllers/EmployeeController.h"
#include "../models/Employee.h"

class EmployeeControllerTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Setup test environment
    }
    
    void TearDown() override {
        // Cleanup
    }
};

TEST_F(EmployeeControllerTest, CreateEmployee_ValidData_ReturnsSuccess) {
    // Test employee creation with valid data
    Employee emp("John Doe", "Software Engineer", "Engineering");
    EXPECT_EQ(emp.getName(), "John Doe");
    EXPECT_EQ(emp.getPosition(), "Software Engineer");
    EXPECT_EQ(emp.getDepartment(), "Engineering");
}

TEST_F(EmployeeControllerTest, GetEmployee_ExistingId_ReturnsEmployee) {
    // Test retrieving existing employee
    // Implementation here
}`)
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
- EmployeeController.cpp: 85% coverage
- Employee.cpp: 92% coverage
- DepartmentManager.cpp: 65% coverage

Recommendations:
- Add tests for error handling in DepartmentManager
- Increase branch coverage for edge cases`)
      }
    }

    setProgress(100)
    setIsGenerating(false)
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
                <CardDescription>Choose your C++ project source</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="github" className="flex items-center gap-1">
                      <Github className="w-4 h-4" />
                      GitHub
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Code
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="github" className="space-y-4">
                    <div>
                      <Label htmlFor="github-url">Repository URL</Label>
                      <Input
                        id="github-url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/user/repo.git"
                      />
                    </div>
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
                    {generatedTests ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Badge variant="secondary">Google Test</Badge>
                          <Badge variant="secondary">C++17</Badge>
                          <Badge variant="outline">Auto-generated</Badge>
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{generatedTests}</code>
                        </pre>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <FileText className="w-4 h-4 mr-1" />
                            Download Tests
                          </Button>
                          <Button variant="outline" size="sm">
                            <Github className="w-4 h-4 mr-1" />
                            Create PR
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
