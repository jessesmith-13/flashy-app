import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { Textarea } from '../../ui/textarea'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Sparkles, ArrowLeft, MessageSquare, FileText, FileSpreadsheet, Upload } from 'lucide-react'

export function AIGenerateScreen() {
  const { selectedDeckId, decks } = useStore()
  const { navigateTo } = useNavigation()
  const [activeTab, setActiveTab] = useState('chat')
  
  // AI Chat state
  const [topic, setTopic] = useState('')
  const [numCards, setNumCards] = useState('10')
  const [loading, setLoading] = useState(false)

  // CSV Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvLoading, setCsvLoading] = useState(false)

  // PDF Upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  // Get the current deck if navigated from deck detail
  const currentDeck = decks.find(d => d.id === selectedDeckId)
  const backButtonText = currentDeck ? 'Back to Deck' : 'Back to Decks'
  const backView = currentDeck ? 'deck-detail' : 'decks'

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate AI generation
    setTimeout(() => {
      setLoading(false)
      alert('AI deck generation coming soon! This will use AI to create flashcards based on your topic.')
    }, 2000)
  }

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile) return
    
    setCsvLoading(true)
    
    // Simulate CSV processing
    setTimeout(() => {
      setCsvLoading(false)
      alert('CSV import coming soon! Upload a CSV with "Front" and "Back" columns to import flashcards.')
    }, 1500)
  }

  const handlePDFUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pdfFile) return
    
    setPdfLoading(true)
    
    // Simulate PDF processing
    setTimeout(() => {
      setPdfLoading(false)
      alert('PDF import coming soon! AI will extract content from your PDF and generate flashcards.')
    }, 2000)
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigateTo(backView as any)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backButtonText}
          </Button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl text-gray-900 dark:text-gray-100">AI Deck Generator</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Create flashcards with AI or upload files</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">AI Chat</span>
                  <span className="sm:hidden">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="csv" className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">CSV</span>
                  <span className="sm:hidden">CSV</span>
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                  <span className="sm:hidden">PDF</span>
                </TabsTrigger>
              </TabsList>

              {/* AI Chat Tab */}
              <TabsContent value="chat">
                <form onSubmit={handleAIGenerate} className="space-y-6">
                  <div>
                    <Label htmlFor="topic">Topic or Subject</Label>
                    <Textarea
                      id="topic"
                      placeholder="E.g., 'Spanish verbs', 'World War 2 dates', 'Python functions'..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      required
                      className="mt-1 min-h-[100px] bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Describe what you want to learn. Be as specific as possible for better results.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="numCards">Number of Cards</Label>
                    <Input
                      id="numCards"
                      type="number"
                      min="5"
                      max="50"
                      value={numCards}
                      onChange={(e) => setNumCards(e.target.value)}
                      required
                      className="mt-1 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-sm text-blue-900 dark:text-blue-300 mb-2">💡 Pro Tips:</h3>
                    <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                      <li>• Be specific about the difficulty level</li>
                      <li>• Include context (e.g., "for beginners", "advanced level")</li>
                      <li>• Mention the format you prefer</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12"
                  >
                    {loading ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Flashcards
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* CSV Upload Tab */}
              <TabsContent value="csv">
                <form onSubmit={handleCSVUpload} className="space-y-6">
                  <div>
                    <Label htmlFor="csv-upload">Upload CSV File</Label>
                    <div className="mt-2">
                      <label
                        htmlFor="csv-upload"
                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">CSV file with "Front" and "Back" columns</p>
                          {csvFile && (
                            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                              Selected: {csvFile.name}
                            </p>
                          )}
                        </div>
                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                    <h3 className="text-sm text-emerald-900 dark:text-emerald-300 mb-2">📊 CSV Format:</h3>
                    <ul className="text-xs text-emerald-800 dark:text-emerald-400 space-y-1">
                      <li>• First row should contain headers: "Front" and "Back"</li>
                      <li>• Each subsequent row creates one flashcard</li>
                      <li>• Example: Front,Back</li>
                      <li className="ml-4">What is 2+2?,4</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    disabled={!csvFile || csvLoading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-12"
                  >
                    {csvLoading ? (
                      <>Importing...</>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-5 h-5 mr-2" />
                        Import from CSV
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* PDF Upload Tab */}
              <TabsContent value="pdf">
                <form onSubmit={handlePDFUpload} className="space-y-6">
                  <div>
                    <Label htmlFor="pdf-upload">Upload PDF File</Label>
                    <div className="mt-2">
                      <label
                        htmlFor="pdf-upload"
                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">PDF document (Max 10MB)</p>
                          {pdfFile && (
                            <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                              Selected: {pdfFile.name}
                            </p>
                          )}
                        </div>
                        <input
                          id="pdf-upload"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pdf-numCards">Number of Cards to Generate</Label>
                    <Input
                      id="pdf-numCards"
                      type="number"
                      min="5"
                      max="50"
                      defaultValue="15"
                      className="mt-1 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-sm text-blue-900 dark:text-blue-300 mb-2">📄 How it works:</h3>
                    <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                      <li>• AI will extract text content from your PDF</li>
                      <li>• Key concepts and definitions will be identified</li>
                      <li>• Flashcards will be automatically generated</li>
                      <li>• You can review and edit before saving</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    disabled={!pdfFile || pdfLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12"
                  >
                    {pdfLoading ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 mr-2" />
                        Generate from PDF
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm text-gray-700 dark:text-gray-300 mb-3">Coming Soon:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>✨ Full AI integration for all generation methods</li>
                <li>🎯 Difficulty level customization</li>
                <li>🌐 Multi-language support</li>
                <li>🖼️ Image extraction from PDFs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}