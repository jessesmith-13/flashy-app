import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import { Camera, Globe } from 'lucide-react'

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  displayName: string
  onDisplayNameChange: (value: string) => void
  avatarUrl: string
  onAvatarUrlChange: (value: string) => void
  decksPublic: boolean
  onDecksPublicChange: (value: boolean) => void
  onAvatarUploadClick: () => void
  onSave: () => void
  saving: boolean
  uploading: boolean
}

export function EditProfileDialog({
  open,
  onOpenChange,
  displayName,
  onDisplayNameChange,
  avatarUrl,
  onAvatarUrlChange,
  decksPublic,
  onDecksPublicChange,
  onAvatarUploadClick,
  onSave,
  saving,
  uploading,
}: EditProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="Enter display name"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">This will be shown publicly instead of your email</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar</Label>
            <div className="flex items-center gap-2">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onAvatarUploadClick}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-400 mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
            </div>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => onAvatarUrlChange(e.target.value)}
              placeholder="Or paste image URL"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Upload a photo or enter a URL</p>
          </div>
          <div className="flex items-center justify-between space-x-2 py-2">
            <div className="flex items-center gap-2 flex-1">
              <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <Label htmlFor="decksPublic" className="cursor-pointer">Public Decks</Label>
                <p className="text-xs text-gray-500">Allow others to see your decks on your profile</p>
              </div>
            </div>
            <Switch
              id="decksPublic"
              checked={decksPublic}
              onCheckedChange={onDecksPublicChange}
            />
          </div>
          <Button
            onClick={onSave}
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
