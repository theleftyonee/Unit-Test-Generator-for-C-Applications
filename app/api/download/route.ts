import { type NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"

export async function POST(request: NextRequest) {
  try {
    const { type, data, fileName } = await request.json()

    switch (type) {
      case "single-test":
        return downloadSingleTest(data, fileName)

      case "all-tests":
        return downloadAllTests(data)

      case "coverage-report":
        return downloadCoverageReport(data)

      case "project-bundle":
        return downloadProjectBundle(data)

      default:
        return NextResponse.json({ error: "Invalid download type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}

async function downloadSingleTest(testContent: string, fileName: string) {
  const headers = new Headers()
  headers.set("Content-Type", "text/plain")
  headers.set("Content-Disposition", `attachment; filename="${fileName}"`)

  return new NextResponse(testContent, { headers })
}

async function downloadAllTests(testsData: any[]) {
  const zip = new JSZip()

  // Add test files
  testsData.forEach((test, index) => {
    const fileName = test.fileName || `test_${index + 1}.cpp`
    zip.file(`tests/${fileName}`, test.content)
  })

  // Add CMakeLists.txt for tests
  const cmakeContent = generateTestCMakeFile(testsData)
  zip.file("tests/CMakeLists.txt", cmakeContent)

  // Add README
  const readmeContent = generateTestReadme(testsData)
  zip.file("tests/README.md", readmeContent)

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" })

  const headers = new Headers()
  headers.set("Content-Type", "application/zip")
  headers.set("Content-Disposition", 'attachment; filename="cpp_unit_tests.zip"')

  return new NextResponse(zipBuffer, { headers })
}

async function downloadCoverageReport(coverageData: any) {
  const zip = new JSZip()

  // Add coverage JSON data
  zip.file("coverage/coverage.json", JSON.stringify(coverageData, null, 2))

  // Add coverage summary
  const summary = generateCoverageSummary(coverageData)
  zip.file("coverage/summary.txt", summary)

  // Add HTML report if available
  if (coverageData.htmlReport) {
    zip.file("coverage/index.html", coverageData.htmlReport)
  }

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" })

  const headers = new Headers()
  headers.set("Content-Type", "application/zip")
  headers.set("Content-Disposition", 'attachment; filename="coverage_report.zip"')

  return new NextResponse(zipBuffer, { headers })
}

async function downloadProjectBundle(projectData: any) {
  const zip = new JSZip()

  // Add source files
  if (projectData.sourceFiles) {
    projectData.sourceFiles.forEach((file: any) => {
      zip.file(`src/${file.name}`, file.content)
    })
  }

  // Add test files
  if (projectData.testFiles) {
    projectData.testFiles.forEach((file: any) => {
      zip.file(`tests/${file.name}`, file.content)
    })
  }

  // Add build configuration
  zip.file("CMakeLists.txt", generateMainCMakeFile(projectData))

  // Add build scripts
  zip.file("scripts/build.sh", generateBuildScript())
  zip.file("scripts/run_tests.sh", generateTestScript())

  // Add documentation
  zip.file("README.md", generateProjectReadme(projectData))

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" })

  const headers = new Headers()
  headers.set("Content-Type", "application/zip")
  headers.set("Content-Disposition", 'attachment; filename="cpp_project_with_tests.zip"')

  return new NextResponse(zipBuffer, { headers })
}

function generateTestCMakeFile(testsData: any[]): string {
  return `
cmake_minimum_required(VERSION 3.10)
project(CppUnitTests)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Google Test
find_package(GTest REQUIRED)
find_package(GMock REQUIRED)

# Include directories
include_directories(\${CMAKE_SOURCE_DIR}/../src)

# Test files
${testsData
  .map((test, index) => `add_executable(test_${index + 1} ${test.fileName || `test_${index + 1}.cpp`})`)
  .join("\n")}

# Link libraries
${testsData
  .map((test, index) => `target_link_libraries(test_${index + 1} GTest::GTest GTest::Main GMock::GMock pthread)`)
  .join("\n")}

# Add tests
${testsData.map((test, index) => `add_test(NAME Test${index + 1} COMMAND test_${index + 1})`).join("\n")}
`
}

function generateTestReadme(testsData: any[]): string {
  return `
# C++ Unit Tests

This directory contains automatically generated unit tests for your C++ project.

## Generated Tests

${testsData
  .map((test, index) => `- **${test.fileName || `test_${index + 1}.cpp`}**: ${test.description || "Unit test file"}`)
  .join("\n")}

## Building and Running Tests

1. Make sure you have Google Test installed
2. Create a build directory: \`mkdir build && cd build\`
3. Configure with CMake: \`cmake ..\`
4. Build: \`make\`
5. Run tests: \`ctest\` or run individual test executables

## Coverage Analysis

To generate coverage reports:

1. Build with coverage flags: \`cmake -DCMAKE_CXX_FLAGS="--coverage" ..\`
2. Run tests: \`ctest\`
3. Generate report: \`gcov *.gcda\`
4. Create HTML report: \`lcov --capture --directory . --output-file coverage.info && genhtml coverage.info --output-directory coverage_html\`

## Requirements

- CMake 3.10+
- Google Test framework
- C++17 compatible compiler
- gcov and lcov for coverage analysis
`
}

function generateCoverageSummary(coverageData: any): string {
  const totalLines = coverageData.totalLines || 0
  const coveredLines = coverageData.coveredLines || 0
  const percentage = totalLines > 0 ? ((coveredLines / totalLines) * 100).toFixed(1) : "0.0"

  return `
Coverage Summary
================

Total Lines: ${totalLines}
Covered Lines: ${coveredLines}
Coverage Percentage: ${percentage}%

File Details:
${Object.entries(coverageData.files || {})
  .map(
    ([file, data]: [string, any]) =>
      `- ${file}: ${data.coverage || 0}% (${data.coveredLines || 0}/${data.totalLines || 0} lines)`,
  )
  .join("\n")}

Generated on: ${new Date().toISOString()}
`
}

function generateMainCMakeFile(projectData: any): string {
  return `
cmake_minimum_required(VERSION 3.10)
project(${projectData.projectName || "CppProject"})

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add compiler flags
set(CMAKE_CXX_FLAGS "\${CMAKE_CXX_FLAGS} -Wall -Wextra -g")

# Add coverage flags for debug builds
set(CMAKE_CXX_FLAGS_DEBUG "\${CMAKE_CXX_FLAGS_DEBUG} --coverage")

# Source files
file(GLOB_RECURSE SOURCES "src/*.cpp" "src/*.cc")
file(GLOB_RECURSE HEADERS "src/*.h" "src/*.hpp")

# Create library
add_library(project_lib \${SOURCES} \${HEADERS})

# Add subdirectories
add_subdirectory(tests)

# Enable testing
enable_testing()
`
}

function generateBuildScript(): string {
  return `#!/bin/bash
# Build script for C++ project with tests

set -e

echo "Building C++ project with unit tests..."

# Create build directory
mkdir -p build
cd build

# Configure with CMake
cmake .. -DCMAKE_BUILD_TYPE=Debug

# Build
make -j\$(nproc)

echo "Build completed successfully!"
echo "Run './scripts/run_tests.sh' to execute tests"
`
}

function generateTestScript(): string {
  return `#!/bin/bash
# Test execution script

set -e

echo "Running unit tests..."

cd build

# Run tests
ctest --output-on-failure

# Generate coverage report
echo "Generating coverage report..."
gcov -r ../ *.gcda

# Create HTML coverage report if lcov is available
if command -v lcov &> /dev/null; then
    lcov --capture --directory . --output-file coverage.info
    genhtml coverage.info --output-directory ../coverage_html
    echo "HTML coverage report generated in coverage_html/"
fi

echo "Tests completed!"
`
}

function generateProjectReadme(projectData: any): string {
  return `
# ${projectData.projectName || "C++ Project"} with Unit Tests

This project includes automatically generated unit tests and build configuration.

## Project Structure

\`\`\`
├── src/                 # Source files
├── tests/               # Unit test files
├── scripts/             # Build and test scripts
├── build/               # Build directory (generated)
├── coverage_html/       # Coverage reports (generated)
└── CMakeLists.txt       # Main CMake configuration
\`\`\`

## Quick Start

1. **Build the project:**
   \`\`\`bash
   chmod +x scripts/build.sh
   ./scripts/build.sh
   \`\`\`

2. **Run tests:**
   \`\`\`bash
   chmod +x scripts/run_tests.sh
   ./scripts/run_tests.sh
   \`\`\`

## Requirements

- CMake 3.10+
- C++17 compatible compiler (GCC 7+, Clang 5+)
- Google Test framework
- gcov and lcov (for coverage analysis)

## Installation of Dependencies

### Ubuntu/Debian:
\`\`\`bash
sudo apt-get update
sudo apt-get install build-essential cmake libgtest-dev libgmock-dev gcov lcov
\`\`\`

### macOS:
\`\`\`bash
brew install cmake googletest gcovr lcov
\`\`\`

## Generated Tests

The unit tests were automatically generated using AI and include:
- Comprehensive test coverage for public methods
- Edge case testing
- Error condition validation
- Proper test fixtures and setup/teardown

## Coverage Analysis

After running tests, coverage reports are available in:
- Text format: Check terminal output
- HTML format: Open \`coverage_html/index.html\` in a browser

Target coverage: 80%+ line coverage, 85%+ function coverage

## Contributing

When adding new source files:
1. Place them in the \`src/\` directory
2. Regenerate tests using the C++ Unit Test Generator
3. Update this README if needed

Generated on: ${new Date().toISOString()}
`
}
