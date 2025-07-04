"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface LLMProvider {
  type: "openai" | "ollama" | "llamacpp" | "textgen"
  model: string
  endpoint?: string
  apiKey?: string
}

interface LLMProviderConfigProps {
  selectedProvider: LLMProvider
  onProviderChange: (provider: LLMProvider) => void
}

export function LLMProviderConfig({ selectedProvider, onProviderChange }: LLMProviderConfigProps) {
  const [availableProviders, setAvailableProviders] = useState<any>({})
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    loadAvailableProviders()
  }, [])

  const loadAvailableProviders = async () => {
    try {
      const response = await fetch("/api/llm-providers")
      const data = await response.json()
      setAvailableProviders(data.providers)
    } catch (error) {
      console.error("Failed to load providers:", error)
    }
  }

  const testConnection = async () => {
    setConnectionStatus("testing")
    setErrorMessage("")

    try {
      const response = await fetch("/api/llm-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider.type,
          endpoint: selectedProvider.endpoint,
          model: selectedProvider.model,
        }),
      })

      const result = await response.json()

      if (result.connected) {
        setConnectionStatus("success")
        setAvailableModels(result.availableModels || [])
      } else {
        setConnectionStatus("error")
        setErrorMessage(result.error || "Connection failed")
      }
    } catch (error) {
      setConnectionStatus("error")
      setErrorMessage("Failed to test connection")
    }
  }

  const handleProviderTypeChange = (type: string) => {
    const provider = availableProviders[type]
    onProviderChange({
      ...selectedProvider,
      type: type as any,
      model: provider?.models?.[0] || "",
      endpoint: provider?.endpoint || "",
      apiKey: "",
    })
    setConnectionStatus("idle")
    setAvailableModels([])
  }

  const currentProvider = availableProviders[selectedProvider.type]

  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Provider Configuration</CardTitle>
        <CardDescription>Configure your preferred Large Language Model provider for test generation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Selection */}
        <div>
          <Label htmlFor="provider-type">Provider</Label>
          <Select value={selectedProvider.type} onValueChange={handleProviderTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select LLM Provider" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(availableProviders).map(([key, provider]: [string, any]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    {provider.name}
                    {provider.requiresApiKey && (
                      <Badge variant="outline" className="text-xs">
                        API Key
                      </Badge>
                    )}
                    {!provider.requiresApiKey && (
                      <Badge variant="secondary" className="text-xs">
                        Local
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Selection */}
        <div>
          <Label htmlFor="model">Model</Label>
          <Select
            value={selectedProvider.model}
            onValueChange={(value) => onProviderChange({ ...selectedProvider, model: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {(availableModels.length > 0 ? availableModels : currentProvider?.models || []).map((model: string) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Endpoint Configuration for Local Providers */}
        {selectedProvider.type !== "openai" && (
          <div>
            <Label htmlFor="endpoint">Endpoint URL</Label>
            <Input
              id="endpoint"
              value={selectedProvider.endpoint}
              onChange={(e) => onProviderChange({ ...selectedProvider, endpoint: e.target.value })}
              placeholder={currentProvider?.endpoint || "http://localhost:11434"}
            />
            <p className="text-xs text-gray-500 mt-1">Make sure your local LLM server is running on this endpoint</p>
          </div>
        )}

        {/* API Key for Cloud Providers */}
        {currentProvider?.requiresApiKey && (
          <div>
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={selectedProvider.apiKey}
              onChange={(e) => onProviderChange({ ...selectedProvider, apiKey: e.target.value })}
              placeholder="Enter your API key"
            />
          </div>
        )}

        {/* Connection Test */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={testConnection} disabled={connectionStatus === "testing"}>
            {connectionStatus === "testing" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </Button>

          {connectionStatus === "success" && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}

          {connectionStatus === "error" && (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Failed
            </Badge>
          )}
        </div>

        {/* Error Message */}
        {connectionStatus === "error" && errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Available Models from Server */}
        {availableModels.length > 0 && (
          <div>
            <Label>Available Models on Server:</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {availableModels.map((model) => (
                <Badge key={model} variant="outline" className="text-xs">
                  {model}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Provider Information */}
        {currentProvider && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Provider Information:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>
                • <strong>Type:</strong> {currentProvider.requiresApiKey ? "Cloud API" : "Local Server"}
              </li>
              <li>
                • <strong>Default Endpoint:</strong> {currentProvider.endpoint}
              </li>
              <li>
                • <strong>Supported Models:</strong> {currentProvider.models?.join(", ")}
              </li>
              {selectedProvider.type === "ollama" && (
                <li>
                  • <strong>Installation:</strong> Download from ollama.ai and run "ollama serve"
                </li>
              )}
              {selectedProvider.type === "llamacpp" && (
                <li>
                  • <strong>Installation:</strong> Build llama.cpp and run "./server -m model.gguf"
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
