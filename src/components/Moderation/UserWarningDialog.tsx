import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group'
import { AlertTriangle } from 'lucide-react'

interface UserWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (warning: {
    reason: string
    customReason?: string
    message?: string
    timeToResolve: string
    customTime?: string
  }) => void
  flagDetails?: {
    targetType: string
    targetName: string
    reason: string
    reporterNotes: string
  }
  targetUserName?: string
}

export function UserWarningDialog({ open, onOpenChange, onSubmit, flagDetails, targetUserName }: UserWarningDialogProps) {
  const [reason, setReason] = useState<string>('inaccurate')
  const [customReason, setCustomReason] = useState('')
  const [message, setMessage] = useState('')
  const [timeToResolve, setTimeToResolve] = useState('24')
  const [customTime, setCustomTime] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmit({
        reason,
        customReason: reason === 'other' ? customReason : undefined,
        message: message.trim() || undefined,
        timeToResolve,
        customTime: timeToResolve === 'custom' ? customTime : undefined
      })
      
      // Reset form
      setReason('inaccurate')
      setCustomReason('')
      setMessage('')
      setTimeToResolve('24')
      setCustomTime('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to submit warning:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Warn User
          </DialogTitle>
          <DialogDescription>
            {targetUserName && `Send a warning to ${targetUserName} about their content.`}
            {!targetUserName && `Send a warning to the user about their content.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason */}
          <div className="space-y-2">
            <Label>Why are you warning this user? *</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inaccurate" id="inaccurate" />
                <Label htmlFor="inaccurate" className="font-normal cursor-pointer">
                  Inaccurate content
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="offensive" id="offensive" />
                <Label htmlFor="offensive" className="font-normal cursor-pointer">
                  Offensive language
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="copyright" id="copyright" />
                <Label htmlFor="copyright" className="font-normal cursor-pointer">
                  Copyright issue
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="guidelines" id="guidelines" />
                <Label htmlFor="guidelines" className="font-normal cursor-pointer">
                  Community guidelines violation
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="font-normal cursor-pointer">
                  Other
                </Label>
              </div>
            </RadioGroup>
            
            {reason === 'other' && (
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please specify the reason..."
                className="mt-2"
                rows={2}
              />
            )}
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message to user (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., Please edit your deck to remove copyrighted textbook excerpts."
              rows={3}
            />
          </div>

          {/* Time to Resolve */}
          <div className="space-y-2">
            <Label>Time to resolve before action *</Label>
            <RadioGroup value={timeToResolve} onValueChange={setTimeToResolve}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="24" id="24h" />
                <Label htmlFor="24h" className="font-normal cursor-pointer">
                  24 hours
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="48" id="48h" />
                <Label htmlFor="48h" className="font-normal cursor-pointer">
                  48 hours
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="168" id="7d" />
                <Label htmlFor="7d" className="font-normal cursor-pointer">
                  7 days
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Custom
                </Label>
              </div>
            </RadioGroup>

            {timeToResolve === 'custom' && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  placeholder="Enter hours"
                  min="1"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">hours</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || (reason === 'other' && !customReason.trim()) || (timeToResolve === 'custom' && (!customTime || parseInt(customTime) < 1))}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {submitting ? 'Sending...' : 'Send Warning'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}