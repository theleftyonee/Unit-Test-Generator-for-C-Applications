#!/usr/bin/env python3
"""
GitHub Repository Analyzer for C++ Unit Test Generation
Clones repositories and analyzes C++ code to extract classes, methods, and dependencies
"""

import os
import re
import json
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse


class CppCodeAnalyzer:
    """Analyzes C++ code to extract classes, methods, and dependencies"""

    def __init__(self):
        self.classes = {}
        self.includes = set()
        self.namespaces = set()

    def analyze_file(self, file_path: str) -> Dict:
        """Analyze a single C++ file and extract class information"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            return self._parse_cpp_content(content, file_path)
        except Exception as e:
            import sys
            print(f"Error analyzing {file_path}: {e}", file=sys.stderr)
            return {}

    def _parse_cpp_content(self, content: str, file_path: str) -> Dict:
        """Parse C++ content and extract class definitions"""
        file_info = {
            'file_path': file_path,
            'classes': [],
            'includes': [],
            'namespaces': [],
            'functions': []
        }

        # Extract includes
        include_pattern = r'#include\s*[<"]([^>"]+)[>"]'
        includes = re.findall(include_pattern, content)
        file_info['includes'] = includes

        # Extract namespaces
        namespace_pattern = r'namespace\s+(\w+)\s*{'
        namespaces = re.findall(namespace_pattern, content)
        file_info['namespaces'] = namespaces

        # Extract class definitions
        class_pattern = r'class\s+(\w+)(?:\s*:\s*(?:public|private|protected)\s+(\w+))?\s*{([^}]+)}'
        classes = re.findall(class_pattern, content, re.DOTALL)

        for class_match in classes:
            class_name = class_match[0]
            base_class = class_match[1] if class_match[1] else None
            class_body = class_match[2]

            class_info = {
                'name': class_name,
                'base_class': base_class,
                'methods': self._extract_methods(class_body),
                'constructors': self._extract_constructors(class_body),
                'destructors': self._extract_destructors(class_body),
                'members': self._extract_members(class_body),
                'access_specifiers': self._extract_access_specifiers(class_body)
            }
            file_info['classes'].append(class_info)

        # Extract standalone functions
        function_pattern = r'(?:(\w+)\s+)?(\w+)\s+(\w+)\s*\([^)]*\)\s*{'
        functions = re.findall(function_pattern, content)
        for func_match in functions:
            return_type = func_match[0] if func_match[0] else 'void'
            func_name = func_match[1] if func_match[1] else func_match[2]
            file_info['functions'].append({
                'name': func_name,
                'return_type': return_type
            })

        return file_info

    def _extract_methods(self, class_body: str) -> List[Dict]:
        """Extract method definitions from class body"""
        methods = []

        # Method pattern: return_type method_name(params) { or return_type method_name(params);
        method_pattern = r'(?:virtual\s+)?(\w+(?:::\w+)?)\s+(\w+)\s*\([^)]*\)\s*(?:const)?\s*(?:override)?\s*(?:{|\s*;)'
        method_matches = re.findall(method_pattern, class_body)

        for match in method_matches:
            return_type = match[0]
            method_name = match[1]

            # Skip constructors and destructors
            if method_name in ['~', 'operator']:
                continue

            methods.append({
                'name': method_name,
                'return_type': return_type,
                'is_virtual': 'virtual' in class_body[:class_body.find(method_name)],
                'is_const': 'const' in class_body[class_body.find(method_name):class_body.find(method_name)+100]
            })

        return methods

    def _extract_constructors(self, class_body: str) -> List[Dict]:
        """Extract constructor definitions"""
        constructors = []
        constructor_pattern = r'(\w+)\s*\([^)]*\)\s*(?::\s*[^)]*)?\s*(?:{|\s*;)'
        matches = re.findall(constructor_pattern, class_body)

        for match in matches:
            if match and not match.startswith('~'):  # Not a destructor
                constructors.append({
                    'name': match,
                    'type': 'constructor'
                })

        return constructors

    def _extract_destructors(self, class_body: str) -> List[Dict]:
        """Extract destructor definitions"""
        destructors = []
        destructor_pattern = r'~(\w+)\s*\([^)]*\)\s*(?:{|\s*;)'
        matches = re.findall(destructor_pattern, class_body)

        for match in matches:
            destructors.append({
                'name': f"~{match}",
                'type': 'destructor'
            })

        return destructors

    def _extract_members(self, class_body: str) -> List[Dict]:
        """Extract member variables"""
        members = []
        member_pattern = r'(?:(\w+(?:::\w+)?)\s+)?(\w+)\s+(\w+)\s*;'
        matches = re.findall(member_pattern, class_body)

        for match in matches:
            member_type = match[0] if match[0] else 'auto'
            member_name = match[2]
            members.append({
                'name': member_name,
                'type': member_type
            })

        return members

    def _extract_access_specifiers(self, class_body: str) -> Dict:
        """Extract access specifiers (public, private, protected)"""
        access_pattern = r'(public|private|protected):'
        matches = re.findall(access_pattern, class_body)
        return {'specifiers': matches}


class GitHubRepositoryAnalyzer:
    """Analyzes GitHub repositories and extracts C++ code information"""

    def __init__(self):
        self.temp_dir = None
        self.analyzer = CppCodeAnalyzer()

    def analyze_repository(self, github_url: str) -> Dict:
        """Analyze a GitHub repository and return C++ code information"""
        try:
            # Clone the repository
            repo_path = self._clone_repository(github_url)
            if not repo_path:
                return {'error': 'Failed to clone repository'}

            # Analyze C++ files
            cpp_files = self._find_cpp_files(repo_path)
            analysis_results = []

            for cpp_file in cpp_files:
                file_analysis = self.analyzer.analyze_file(cpp_file)
                if file_analysis:
                    analysis_results.append(file_analysis)

            # Generate summary
            summary = self._generate_summary(analysis_results)

            return {
                'repository_url': github_url,
                'repository_path': repo_path,
                'files_analyzed': len(cpp_files),
                'summary': summary,
                'detailed_analysis': analysis_results
            }

        except Exception as e:
            return {'error': f'Analysis failed: {str(e)}'}
        finally:
            # Clean up temp directory
            if self.temp_dir and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _clone_repository(self, github_url: str) -> Optional[str]:
        """Clone a GitHub repository to a temporary directory"""
        try:
            # Create temporary directory
            self.temp_dir = tempfile.mkdtemp(prefix='github_analysis_')

            # Use the provided URL directly
            clone_url = github_url
            result = subprocess.run(
                ['git', 'clone', clone_url, self.temp_dir],
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )

            if result.returncode != 0:
                import sys
                print(f"Git clone failed: {result.stderr}", file=sys.stderr)
                return None

            return self.temp_dir

        except Exception as e:
            import sys
            print(f"Error cloning repository: {e}", file=sys.stderr)
            return None

    def _find_cpp_files(self, repo_path: str) -> List[str]:
        """Find all C++ files in the repository"""
        cpp_extensions = {'.cpp', '.cc', '.cxx', '.hpp', '.h', '.hh', '.hxx'}
        cpp_files = []

        for root, dirs, files in os.walk(repo_path):
            # Skip common directories that shouldn't be analyzed
            dirs[:] = [d for d in dirs if d not in {
                '.git', 'node_modules', 'build', 'bin', 'obj', 'target'}]

            for file in files:
                if Path(file).suffix.lower() in cpp_extensions:
                    cpp_files.append(os.path.join(root, file))

        return cpp_files

    def _generate_summary(self, analysis_results: List[Dict]) -> Dict:
        """Generate a summary of the analysis results"""
        total_classes = 0
        total_methods = 0
        total_functions = 0
        all_includes = set()
        all_namespaces = set()

        for result in analysis_results:
            total_classes += len(result.get('classes', []))
            total_functions += len(result.get('functions', []))

            for cls in result.get('classes', []):
                total_methods += len(cls.get('methods', []))

            all_includes.update(result.get('includes', []))
            all_namespaces.update(result.get('namespaces', []))

        return {
            'total_classes': total_classes,
            'total_methods': total_methods,
            'total_functions': total_functions,
            'unique_includes': list(all_includes),
            'unique_namespaces': list(all_namespaces),
            'files_analyzed': len(analysis_results)
        }


def main():
    """Main function for testing"""
    import sys

    analyzer = GitHubRepositoryAnalyzer()

    if len(sys.argv) < 2:
        print(json.dumps({'error': 'GitHub URL is required'}, indent=2))
        sys.exit(1)

    github_url = sys.argv[1]

    try:
        result = analyzer.analyze_repository(github_url)
        print(json.dumps(result, indent=2))
    except Exception as e:
        error_result = {
            'error': f'Analysis failed: {str(e)}',
            'repository_url': github_url,
            'files_analyzed': 0,
            'summary': {
                'total_classes': 0,
                'total_methods': 0,
                'total_functions': 0,
                'unique_includes': [],
                'unique_namespaces': []
            },
            'detailed_analysis': []
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
