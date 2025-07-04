import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, FileText, Cog, CheckCircle, BarChart3 } from "lucide-react"

export function ArchitectureDiagram() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Unit Test Generation Architecture</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <ArrowRight className="text-gray-400" />
            <div className="flex-shrink-0 w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
              <Cog className="w-8 h-8 text-purple-600" />
            </div>
            <ArrowRight className="text-gray-400" />
            <div className="flex-1 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold">Step 1: Initial Generation</h3>
              <p className="text-sm text-gray-600">LLM generates unit tests from C++ source with YAML instructions</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <ArrowRight className="text-gray-400" />
            <div className="flex-shrink-0 w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
              <Cog className="w-8 h-8 text-purple-600" />
            </div>
            <ArrowRight className="text-gray-400" />
            <div className="flex-1 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold">Step 2: Refinement</h3>
              <p className="text-sm text-gray-600">Remove duplicates, add libraries, improve test quality</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center">
              <Cog className="w-8 h-8 text-orange-600" />
            </div>
            <ArrowRight className="text-gray-400" />
            <div className="flex-shrink-0 w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
              <Cog className="w-8 h-8 text-purple-600" />
            </div>
            <ArrowRight className="text-gray-400" />
            <div className="flex-1 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold">Step 3: Build & Debug</h3>
              <p className="text-sm text-gray-600">Handle build issues, fix compilation errors iteratively</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-indigo-600" />
            </div>
            <ArrowRight className="text-gray-400" />
            <div className="flex-shrink-0 w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
              <Cog className="w-8 h-8 text-purple-600" />
            </div>
            <ArrowRight className="text-gray-400" />
            <div className="flex-1 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold">Step 4: Coverage Analysis</h3>
              <p className="text-sm text-gray-600">Calculate coverage, optimize tests, generate reports</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
