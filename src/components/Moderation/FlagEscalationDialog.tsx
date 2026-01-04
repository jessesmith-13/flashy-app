import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { AlertTriangle } from 'lucide-react'

interface FlagEscalationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEscalate: (reason: string) => Promise<void>
  flagDetails?: {
    targetType: string
    targetName: string
    reason: string
    reporterNotes?: string
  }
}

export function FlagEscalationDialog({ 
  open, 
  onOpenChange, 
  onEscalate,
  flagDetails 
}: FlagEscalationDialogProps) {
  const [escalationReason, setEscalationReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEscalate = async () => {
    if (!escalationReason.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onEscalate(escalationReason)
      setEscalationReason('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to escalate:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setEscalationReason('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Escalate Ticket to Admin
          </DialogTitle>
          <DialogDescription>
            Add a high-priority comment to notify administrators/superusers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ticket Details Summary */}
          {flagDetails && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Target Type:</span>{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {flagDetails.targetType}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Target:</span>{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {flagDetails.targetName}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Original Reason:</span>{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {flagDetails.reason.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}

          {/* Escalation Reason */}
          <div className="space-y-2">
            <Label htmlFor="escalation-reason">
              Why does this need admin attention? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="escalation-reason"
              placeholder="Explain why this ticket needs admin attention (e.g., 'Requires policy decision', 'Need higher authority to ban user', 'Complex legal concern', etc.)"
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This will add a comment to the ticket and change its priority to alert admins
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEscalate}
            disabled={!escalationReason.trim() || isSubmitting}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Escalating...' : 'Escalate to Admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
