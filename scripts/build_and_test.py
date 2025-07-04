#!/usr/bin/env python3
"""
Build and Test Script
Compiles C++ project with generated tests and runs coverage analysis
"""

import os
import subprocess
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

class CppBuildManager:
    def __init__(self, project_path: str, test_path: str = "tests"):
        self.project_path = Path(project_path)
        self.test_path = Path(test_path)
        self.build_path = Path("build")
        self.coverage_path = Path("coverage")
        
    def setup_build_environment(self):
        """Setup build directories and environment"""
        print("Setting up build environment...")
        
        # Create necessary directories
        self.build_path.mkdir(exist_ok=True)
        self.coverage_path.mkdir(exist_ok=True)
        self.test_path.mkdir(exist_ok=True)
        
        # Generate CMakeLists.txt if it doesn't exist
        cmake_file = self.project_path / "CMakeLists.txt"
        if not cmake_file.exists():
            self.generate_cmake_file()
            
    def generate_cmake_file(self):
        """Generate CMakeLists.txt for the project"""
        cmake_content = """
cmake_minimum_required(VERSION 3.10)
project(CppUnitTestProject)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add compiler flags for coverage
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -g -O0 --coverage")
set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} --coverage")

# Find required packages
find_package(PkgConfig REQUIRED)
pkg_check_modules(GTEST REQUIRED gtest>=1.10.0)
pkg_check_modules(GMOCK REQUIRED gmock>=1.10.0)

# Include directories
include_directories(${CMAKE_SOURCE_DIR})
include_directories(${GTEST_INCLUDE_DIRS})
include_directories(${GMOCK_INCLUDE_DIRS})

# Collect source files
file(GLOB_RECURSE SOURCES "*.cpp" "*.cc" "*.cxx")
file(GLOB_RECURSE HEADERS "*.h" "*.hpp" "*.hxx")
file(GLOB_RECURSE TEST_SOURCES "tests/*.cpp" "tests/*.cc")

# Remove main.cpp from sources for library
list(FILTER SOURCES EXCLUDE REGEX ".*main\\.cpp$")

# Create library from source files
if(SOURCES)
    add_library(project_lib ${SOURCES} ${HEADERS})
endif()

# Create test executable
if(TEST_SOURCES)
    add_executable(run_tests ${TEST_SOURCES})
    
    if(TARGET project_lib)
        target_link_libraries(run_tests project_lib)
    endif()
    
    target_link_libraries(run_tests ${GTEST_LIBRARIES} ${GMOCK_LIBRARIES} pthread)
    
    # Add test target
    enable_testing()
    add_test(NAME unit_tests COMMAND run_tests)
endif()
"""
        
        cmake_file = self.project_path / "CMakeLists.txt"
        with open(cmake_file, 'w') as f:
            f.write(cmake_content.strip())
            
        print(f"Generated CMakeLists.txt at {cmake_file}")
        
    def compile_project(self) -> Tuple[bool, str]:
        """Compile the project with tests"""
        print("Compiling project...")
        
        try:
            # Change to build directory
            os.chdir(self.build_path)
            
            # Run cmake
            cmake_result = subprocess.run(
                ["cmake", ".."],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if cmake_result.returncode != 0:
                return False, f"CMake failed:\n{cmake_result.stderr}"
                
            # Run make
            make_result = subprocess.run(
                ["make", "-j4"],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if make_result.returncode != 0:
                return False, f"Make failed:\n{make_result.stderr}"
                
            return True, f"Build successful:\n{make_result.stdout}"
            
        except subprocess.TimeoutExpired:
            return False, "Build timed out"
        except Exception as e:
            return False, f"Build error: {str(e)}"
        finally:
            # Return to original directory
            os.chdir("..")
            
    def run_tests(self) -> Tuple[bool, str]:
        """Run the compiled tests"""
        print("Running tests...")
        
        test_executable = self.build_path / "run_tests"
        
        if not test_executable.exists():
            return False, "Test executable not found"
            
        try:
            result = subprocess.run(
                [str(test_executable), "--gtest_output=xml:test_results.xml"],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            return result.returncode == 0, result.stdout + result.stderr
            
        except subprocess.TimeoutExpired:
            return False, "Tests timed out"
        except Exception as e:
            return False, f"Test execution error: {str(e)}"
            
    def generate_coverage_report(self) -> Dict:
        """Generate code coverage report using gcov"""
        print("Generating coverage report...")
        
        try:
            # Run gcov on all source files
            coverage_data = {}
            
            # Find all .gcda files
            gcda_files = list(self.build_path.rglob("*.gcda"))
            
            if not gcda_files:
                return {"error": "No coverage data found"}
                
            for gcda_file in gcda_files:
                # Run gcov
                result = subprocess.run(
                    ["gcov", str(gcda_file)],
                    capture_output=True,
                    text=True,
                    cwd=self.build_path
                )
                
                if result.returncode == 0:
                    # Parse gcov output
                    coverage_info = self.parse_gcov_output(result.stdout)
                    coverage_data.update(coverage_info)
                    
            # Generate HTML report using lcov if available
            self.generate_html_coverage_report()
            
            return coverage_data
            
        except Exception as e:
            return {"error": f"Coverage generation failed: {str(e)}"}
            
    def parse_gcov_output(self, gcov_output: str) -> Dict:
        """Parse gcov output to extract coverage information"""
        coverage_info = {}
        
        lines = gcov_output.split('\n')
        current_file = None
        
        for line in lines:
            # Look for file information
            file_match = re.search(r"File '([^']+)'", line)
            if file_match:
                current_file = file_match.group(1)
                coverage_info[current_file] = {
                    'lines_executed': 0,
                    'total_lines': 0,
                    'coverage_percentage': 0.0
                }
                continue
                
            # Look for coverage statistics
            if current_file and "Lines executed:" in line:
                match = re.search(r"Lines executed:(\d+\.\d+)% of (\d+)", line)
                if match:
                    coverage_info[current_file]['coverage_percentage'] = float(match.group(1))
                    coverage_info[current_file]['total_lines'] = int(match.group(2))
                    coverage_info[current_file]['lines_executed'] = int(
                        (float(match.group(1)) / 100.0) * int(match.group(2))
                    )
                    
        return coverage_info
        
    def generate_html_coverage_report(self):
        """Generate HTML coverage report using lcov"""
        try:
            # Check if lcov is available
            subprocess.run(["lcov", "--version"], capture_output=True, check=True)
            
            # Generate lcov info file
            subprocess.run([
                "lcov", "--capture", "--directory", str(self.build_path),
                "--output-file", str(self.coverage_path / "coverage.info")
            ], check=True)
            
            # Generate HTML report
            subprocess.run([
                "genhtml", str(self.coverage_path / "coverage.info"),
                "--output-directory", str(self.coverage_path / "html")
            ], check=True)
            
            print(f"HTML coverage report generated in {self.coverage_path / 'html'}")
            
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("lcov not available, skipping HTML report generation")
            
    def analyze_build_errors(self, build_output: str) -> List[Dict]:
        """Analyze build errors and categorize them"""
        errors = []
        
        error_patterns = [
            (r"error: '([^']+)' was not declared", "undeclared_identifier"),
            (r"fatal error: ([^:]+): No such file", "missing_include"),
            (r"error: no matching function for call to '([^']+)'", "function_signature"),
            (r"error: '([^']+)' does not name a type", "unknown_type"),
            (r"undefined reference to `([^']+)'", "undefined_reference")
        ]
        
        lines = build_output.split('\n')
        
        for line in lines:
            for pattern, error_type in error_patterns:
                match = re.search(pattern, line)
                if match:
                    errors.append({
                        'type': error_type,
                        'message': line.strip(),
                        'identifier': match.group(1) if match.groups() else None
                    })
                    
        return errors
        
    def full_build_and_test_cycle(self) -> Dict:
        """Run complete build, test, and coverage cycle"""
        print("Starting full build and test cycle...")
        
        # Setup environment
        self.setup_build_environment()
        
        # Compile project
        build_success, build_output = self.compile_project()
        
        result = {
            'build_success': build_success,
            'build_output': build_output,
            'test_success': False,
            'test_output': '',
            'coverage_data': {},
            'build_errors': []
        }
        
        if not build_success:
            # Analyze build errors
            result['build_errors'] = self.analyze_build_errors(build_output)
            return result
            
        # Run tests
        test_success, test_output = self.run_tests()
        result['test_success'] = test_success
        result['test_output'] = test_output
        
        if test_success:
            # Generate coverage report
            coverage_data = self.generate_coverage_report()
            result['coverage_data'] = coverage_data
            
        return result

def main():
    """Main function"""
    import sys
    
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    build_manager = CppBuildManager(project_path)
    result = build_manager.full_build_and_test_cycle()
    
    # Save results
    with open("build_test_results.json", 'w') as f:
        json.dump(result, f, indent=2)
        
    print("\nBuild and test cycle complete!")
    print(f"Build success: {result['build_success']}")
    print(f"Test success: {result['test_success']}")
    
    if result['coverage_data'] and 'error' not in result['coverage_data']:
        total_lines = sum(info.get('total_lines', 0) for info in result['coverage_data'].values())
        total_covered = sum(info.get('lines_executed', 0) for info in result['coverage_data'].values())
        overall_coverage = (total_covered / total_lines * 100) if total_lines > 0 else 0
        print(f"Overall coverage: {overall_coverage:.1f}%")

if __name__ == "__main__":
    main()
