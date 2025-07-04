#!/usr/bin/env python3
"""
C++ Project Analysis Script
Analyzes C++ source files and extracts information for test generation
"""

import os
import re
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple

class CppProjectAnalyzer:
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.source_files = []
        self.header_files = []
        self.classes = {}
        self.functions = {}
        
    def scan_project(self) -> Dict:
        """Scan the project directory for C++ files"""
        print(f"Scanning project: {self.project_path}")
        
        # Find all C++ source and header files
        for ext in ['*.cpp', '*.cc', '*.cxx', '*.c++']:
            self.source_files.extend(self.project_path.rglob(ext))
            
        for ext in ['*.h', '*.hpp', '*.hxx', '*.h++']:
            self.header_files.extend(self.project_path.rglob(ext))
            
        print(f"Found {len(self.source_files)} source files")
        print(f"Found {len(self.header_files)} header files")
        
        return {
            'source_files': [str(f) for f in self.source_files],
            'header_files': [str(f) for f in self.header_files],
            'total_files': len(self.source_files) + len(self.header_files)
        }
    
    def extract_classes(self, file_path: Path) -> List[Dict]:
        """Extract class definitions from a C++ file"""
        classes = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Simple regex to find class definitions
            class_pattern = r'class\s+(\w+)(?:\s*:\s*(?:public|private|protected)\s+\w+)?\s*\{'
            matches = re.finditer(class_pattern, content, re.MULTILINE)
            
            for match in matches:
                class_name = match.group(1)
                
                # Extract methods from the class
                methods = self.extract_methods_from_class(content, match.start())
                
                classes.append({
                    'name': class_name,
                    'file': str(file_path),
                    'methods': methods,
                    'line_number': content[:match.start()].count('\n') + 1
                })
                
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            
        return classes
    
    def extract_methods_from_class(self, content: str, class_start: int) -> List[Dict]:
        """Extract method signatures from a class"""
        methods = []
        
        # Find the class body
        brace_count = 0
        class_body_start = content.find('{', class_start)
        if class_body_start == -1:
            return methods
            
        i = class_body_start
        while i < len(content):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    class_body_end = i
                    break
            i += 1
        else:
            return methods
            
        class_body = content[class_body_start:class_body_end]
        
        # Simple method extraction (this could be more sophisticated)
        method_pattern = r'(?:public|private|protected):\s*\n(?:\s*(?:virtual|static|inline)?\s*)*(\w+(?:\s*<[^>]*>)?)\s+(\w+)\s*$$[^)]*$$(?:\s*const)?(?:\s*override)?(?:\s*=\s*0)?;'
        
        for match in re.finditer(method_pattern, class_body, re.MULTILINE):
            return_type = match.group(1).strip()
            method_name = match.group(2).strip()
            
            methods.append({
                'name': method_name,
                'return_type': return_type,
                'signature': match.group(0).strip()
            })
            
        return methods
    
    def extract_functions(self, file_path: Path) -> List[Dict]:
        """Extract standalone function definitions"""
        functions = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Pattern for standalone functions
            func_pattern = r'^(?:(?:inline|static|extern)\s+)*(\w+(?:\s*<[^>]*>)?)\s+(\w+)\s*$$[^)]*$$\s*\{'
            
            for match in re.finditer(func_pattern, content, re.MULTILINE):
                return_type = match.group(1).strip()
                func_name = match.group(2).strip()
                
                # Skip main function and common keywords
                if func_name in ['main', 'if', 'for', 'while', 'switch']:
                    continue
                    
                functions.append({
                    'name': func_name,
                    'return_type': return_type,
                    'file': str(file_path),
                    'line_number': content[:match.start()].count('\n') + 1
                })
                
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            
        return functions
    
    def analyze_dependencies(self) -> Dict:
        """Analyze include dependencies"""
        dependencies = {}
        
        for file_path in self.source_files + self.header_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                includes = re.findall(r'#include\s*[<"]([^>"]+)[>"]', content)
                dependencies[str(file_path)] = includes
                
            except Exception as e:
                print(f"Error analyzing dependencies in {file_path}: {e}")
                
        return dependencies
    
    def generate_analysis_report(self) -> Dict:
        """Generate comprehensive analysis report"""
        print("Generating analysis report...")
        
        # Scan project structure
        project_info = self.scan_project()
        
        # Extract classes and functions
        all_classes = []
        all_functions = []
        
        for file_path in self.source_files + self.header_files:
            classes = self.extract_classes(file_path)
            functions = self.extract_functions(file_path)
            
            all_classes.extend(classes)
            all_functions.extend(functions)
            
        # Analyze dependencies
        dependencies = self.analyze_dependencies()
        
        report = {
            'project_info': project_info,
            'classes': all_classes,
            'functions': all_functions,
            'dependencies': dependencies,
            'statistics': {
                'total_classes': len(all_classes),
                'total_functions': len(all_functions),
                'total_methods': sum(len(cls['methods']) for cls in all_classes)
            }
        }
        
        return report

def main():
    """Main function to run the analysis"""
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python analyze_cpp_project.py <project_path>")
        sys.exit(1)
        
    project_path = sys.argv[1]
    
    if not os.path.exists(project_path):
        print(f"Error: Project path '{project_path}' does not exist")
        sys.exit(1)
        
    analyzer = CppProjectAnalyzer(project_path)
    report = analyzer.generate_analysis_report()
    
    # Save report to JSON file
    output_file = "cpp_analysis_report.json"
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2)
        
    print(f"\nAnalysis complete! Report saved to {output_file}")
    print(f"Found {report['statistics']['total_classes']} classes")
    print(f"Found {report['statistics']['total_functions']} functions")
    print(f"Found {report['statistics']['total_methods']} methods")

if __name__ == "__main__":
    main()
