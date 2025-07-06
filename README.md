
![Screenshot 2025-07-07 004750](https://github.com/user-attachments/assets/b01770ce-6c67-4a96-9706-ef339f37d774)

# C++ Unit Test Generator

An AI-powered tool for automatically generating, refining, and optimizing unit tests for C++ applications using Large Language Models (LLMs). This tool follows an iterative workflow to ensure high-quality, comprehensive test coverage.

## Features

- **Automated Test Generation**: Generate comprehensive unit tests from C++ source code
- **Iterative Refinement**: Remove duplicates, add missing libraries, and improve test quality
- **Build Integration**: Automatically handle build issues and compilation errors
- **Coverage Analysis**: Calculate test coverage and provide optimization recommendations
- **YAML Configuration**: Use structured YAML files for precise LLM instructions
- **Multiple Input Sources**: Support for GitHub repositories and direct code input

## Architecture

The tool follows a 4-step workflow:

1. **Initial Generation**: Generate unit tests from C++ source using LLM with YAML instructions
2. **Refinement**: Remove duplicates, add relevant libraries, improve test structure
3. **Build & Debug**: Handle compilation errors and fix build issues iteratively
4. **Coverage Analysis**: Calculate coverage metrics and optimize test suite

## Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd cpp-unit-test-generator
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Install C++ build tools:
\`\`\`bash
# Ubuntu/Debian
sudo apt-get install build-essential cmake libgtest-dev libgmock-dev gcov lcov

# macOS
brew install cmake googletest gcovr lcov
\`\`\`

4. Set up environment variables:
\`\`\`bash
export OPENAI_API_KEY="your-openai-api-key"
\`\`\`

## Usage

### Web Interface

1. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

2. Open http://localhost:3000 in your browser

3. Choose input method:
   - **GitHub**: Enter repository URL (e.g., https://github.com/keploy/orgChartApi.git)
   - **Code**: Paste C++ source code directly

4. Click "Generate Unit Tests" to start the process

### Command Line Tools

#### Analyze C++ Project
\`\`\`bash
python scripts/analyze_cpp_project.py /path/to/cpp/project
\`\`\`

#### Build and Test
\`\`\`bash
python scripts/build_and_test.py /path/to/cpp/project
\`\`\`

## Configuration

The tool uses YAML configuration files for precise LLM instructions:

- `config/initial-test-generation.yaml`: Initial test generation rules
- `config/test-refinement.yaml`: Test refinement and improvement rules
- `config/build-fix.yaml`: Build error resolution instructions
- `config/coverage-improvement.yaml`: Coverage optimization guidelines

## Example Output

### Generated Unit Tests
\`\`\`cpp
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
    Employee emp("John Doe", "Software Engineer", "Engineering");
    EXPECT_EQ(emp.getName(), "John Doe");
    EXPECT_EQ(emp.getPosition(), "Software Engineer");
    EXPECT_EQ(emp.getDepartment(), "Engineering");
}
\`\`\`

### Coverage Report
\`\`\`
Test Coverage Report:
===================
Lines covered: 156/200 (78%)
Functions covered: 12/15 (80%)
Branches covered: 24/30 (80%)

Detailed Coverage:
- EmployeeController.cpp: 85% coverage
- Employee.cpp: 92% coverage
- DepartmentManager.cpp: 65% coverage
\`\`\`

## API Endpoints

- `POST /api/generate-tests`: Generate unit tests for given C++ code
- `POST /api/analyze-coverage`: Analyze test coverage and provide recommendations

## Requirements

- Node.js 18+
- C++ compiler (GCC/Clang)
- CMake 3.10+
- Google Test framework
- Python 3.8+ (for analysis scripts)
- OpenAI API key

## Supported Features

- **Testing Framework**: Google Test (gtest/gmock)
- **C++ Standards**: C++11, C++14, C++17, C++20
- **Build Systems**: CMake, Make
- **Coverage Tools**: gcov, lcov
- **LLM Models**: GPT-4, GPT-3.5-turbo

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Troubleshooting

### Common Issues

1. **Build Failures**: Ensure all dependencies are installed and CMakeLists.txt is properly configured
2. **Coverage Issues**: Make sure gcov and lcov are installed and accessible
3. **LLM Errors**: Check API key configuration and network connectivity
4. **Test Compilation**: Verify Google Test is properly installed and linked

### Made with 💖 by Saksham during the Keploy API Fellowship Program

### Getting Help

- Check the troubleshooting section in the documentation
