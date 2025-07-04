import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { cppCode, step, buildLogs, existingTests } = await request.json()

    let prompt = ""
    let yamlInstructions = ""

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
        prompt = `Generate comprehensive unit tests for the following C++ code using Google Test framework.

YAML Instructions:
${yamlInstructions}

C++ Code:
${cppCode}

Generate complete, compilable unit tests with proper includes and test structure.`
        break

      case "refine":
        yamlInstructions = `
refinement_rules:
  duplicate_removal:
    - Remove identical test cases
    - Merge similar tests with different parameters
    - Eliminate redundant assertions
  library_management:
    - Add missing include statements
    - Ensure proper Google Test setup
    - Include necessary standard library headers
  test_improvement:
    - Enhance test descriptions
    - Add more edge cases
    - Improve assertion messages
    - Add test documentation
`
        prompt = `Refine the following unit tests by removing duplicates, adding missing libraries, and improving test quality.

YAML Instructions:
${yamlInstructions}

Existing Tests:
${existingTests}

Provide the refined, improved version of the tests.`
        break

      case "fix_build":
        yamlInstructions = `
build_fix_rules:
  error_analysis:
    - Identify compilation errors
    - Fix missing includes
    - Resolve linking issues
    - Fix syntax errors
  common_fixes:
    - Add missing namespace declarations
    - Fix template instantiation issues
    - Resolve dependency conflicts
    - Update deprecated API usage
  validation:
    - Ensure tests compile cleanly
    - Verify all dependencies are available
    - Check for proper test registration
`
        prompt = `Fix the build issues in the following unit tests based on the build logs.

YAML Instructions:
${yamlInstructions}

Build Logs:
${buildLogs}

Current Tests:
${existingTests}

Provide the corrected version of the tests that will compile successfully.`
        break

      case "improve_coverage":
        yamlInstructions = `
coverage_improvement_rules:
  analysis:
    - Identify uncovered code paths
    - Find missing edge cases
    - Locate untested error conditions
  enhancement:
    - Add tests for uncovered lines
    - Include boundary value tests
    - Test exception handling
    - Add integration test scenarios
  optimization:
    - Remove redundant tests
    - Improve test efficiency
    - Better test organization
    - Enhanced documentation
`
        prompt = `Improve test coverage based on the coverage report and add missing tests.

YAML Instructions:
${yamlInstructions}

Coverage Data:
${buildLogs}

Current Tests:
${existingTests}

Generate additional tests to improve coverage and optimize existing ones.`
        break
    }

    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt,
      maxTokens: 2000,
    })

    return NextResponse.json({
      generatedTests: text,
      step,
      success: true,
    })
  } catch (error) {
    console.error("Error generating tests:", error)
    return NextResponse.json({ error: "Failed to generate tests" }, { status: 500 })
  }
}
