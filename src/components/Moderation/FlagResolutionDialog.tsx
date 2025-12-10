import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Textarea } from '../../ui/textarea'
import { Label } from '../../ui/label'
import { CheckCircle, XCircle, Trash2, AlertTriangle } from 'lucide-react'

interface FlagResolutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResolve: (resolutionReason: 'approved' | 'rejected' | 'removed', moderatorNotes: string) => void
  flagDetails: {
    targetType: string
    targetName: string
    reason: string
    reporterNotes?: string
  }
}

export function FlagResolutionDialog({ open, onOpenChange, onResolve, flagDetails }: FlagResolutionDialogProps) {
  const [resolutionReason, setResolutionReason] = useState<'approved' | 'rejected' | 'removed'>('approved')
  const [moderatorNotes, setModeratorNotes] = useState('')

  const handleResolve = () => {
    onResolve(resolutionReason, moderatorNotes)
    setModeratorNotes('')
    setResolutionReason('approved')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setModeratorNotes('')
    setResolutionReason('approved')
    onOpenChange(false)
  }

  const getResolutionIcon = (reason: string) => {
    switch (reason) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'removed':
        return <Trash2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getResolutionDescription = (reason: string) => {
    switch (reason) {
      case 'approved':
        return 'Flag was valid. Content violated community guidelines and action has been taken.'
      case 'rejected':
        return 'Flag was not valid. Content does not violate guidelines and will remain visible.'
      case 'removed':
        return 'Content was deleted by user or admin before resolution. Flag automatically cleared.'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Resolve Flag</DialogTitle>
          <DialogDescription>
            Review the flagged content and select a resolution reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Flag Details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Target Type:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{flagDetails.targetType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Target:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{flagDetails.targetName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Reason:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{flagDetails.reason.replace(/_/g, ' ')}</span>
            </div>
            {flagDetails.reporterNotes && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-500 dark:text-gray-400">Reporter Notes:</span>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{flagDetails.reporterNotes}</p>
              </div>
            )}
          </div>

          {/* Resolution Reason */}
          <div className="space-y-2">
            <Label htmlFor="resolution-reason">Resolution Reason *</Label>
            <Select value={resolutionReason} onValueChange={(v) => setResolutionReason(v as any)}>
              <SelectTrigger id="resolution-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span>Approved - Flag is valid</span>
                  </div>
                </SelectItem>
                <SelectItem value="rejected">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span>Rejected - Not a valid report</span>
                  </div>
                </SelectItem>
                <SelectItem value="removed">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span>Removed - Content deleted</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Resolution Description */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              {getResolutionIcon(resolutionReason)}
              <p className="text-sm text-blue-900 dark:text-blue-100">
                {getResolutionDescription(resolutionReason)}
              </p>
            </div>
          </div>

          {/* Moderator Notes */}
          <div className="space-y-2">
            <Label htmlFor="moderator-notes">
              Moderator Notes
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Optional)</span>
            </Label>
            <Textarea
              id="moderator-notes"
              placeholder="Add any internal notes about this resolution (e.g., actions taken, warnings issued, etc.)"
              value={moderatorNotes}
              onChange={(e) => setModeratorNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              These notes are only visible to moderators and superusers.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleResolve} className="bg-blue-600 hover:bg-blue-700 text-white">
            Resolve Flag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
