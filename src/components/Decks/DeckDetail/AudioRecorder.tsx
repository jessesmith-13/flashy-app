import { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Upload,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import { uploadCardAudio } from "../../../shared/api/storage";
import { MicrophonePermissionHelp } from "./MicrophonePermissionHelp";

interface AudioRecorderProps {
  onAudioSave: (audioUrl: string) => void;
  currentAudioUrl?: string;
  onAudioRemove?: () => void;
  disabled?: boolean;
  label?: string;
  onUploadAudio?: (file: File) => Promise<void>;
}

export function AudioRecorder({
  onAudioSave,

  currentAudioUrl,
  onAudioRemove,
  disabled = false,
  label = "Audio",
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(
    currentAudioUrl || null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied" | "unknown"
  >("unknown");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);

  // Update audio URL when prop changes
  useEffect(() => {
    if (currentAudioUrl !== audioUrl) {
      setAudioUrl(currentAudioUrl || null);
      setAudioBlob(null);
    }
  }, [currentAudioUrl]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrl);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [audioUrl]);

  // Check initial permission state
  useEffect(() => {
    checkPermissionState();
  }, []);

  const checkPermissionState = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      console.log("Microphone permission state:", permissionStatus.state);
      setPermissionState(
        permissionStatus.state as "prompt" | "granted" | "denied"
      );

      // Listen for permission changes
      permissionStatus.onchange = () => {
        console.log(
          "Microphone permission changed to:",
          permissionStatus.state
        );
        setPermissionState(
          permissionStatus.state as "prompt" | "granted" | "denied"
        );
      };
    } catch (error) {
      console.log("Permissions API not supported:", error);
      setPermissionState("unknown");
    }
  };

  // Check if running in iframe
  const isInIframe = window.self !== window.top;

  const startRecording = async () => {
    console.log("=== Starting recording attempt ===");
    console.log("Current permission state:", permissionState);

    try {
      // Re-check permission state in real-time
      try {
        const permissionStatus = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        console.log("Real-time permission check:", permissionStatus.state);
        setPermissionState(
          permissionStatus.state as "prompt" | "granted" | "denied"
        );

        if (permissionStatus.state === "denied") {
          console.log("Permission is denied, showing help");
          toast.error(
            "Microphone access was denied. Click the info button for help."
          );
          setShowPermissionHelp(true);
          return;
        }
      } catch (permError) {
        console.log("Could not check permission status:", permError);
      }

      console.log("Requesting getUserMedia...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("getUserMedia succeeded! Stream:", stream);
      console.log("Audio tracks:", stream.getAudioTracks());

      // Use webm format which is widely supported
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/wav";

      console.log("Using mime type:", mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log("Audio chunk received, size:", event.data.size);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("Recording stopped, creating blob");
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log("Blob created, size:", blob.size);
        setAudioBlob(blob);

        // Create a temporary URL for playback
        const url = URL.createObjectURL(blob);
        if (audioUrl && audioUrl.startsWith("blob:")) {
          URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Clear recording time
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
      };

      mediaRecorder.start();
      console.log("MediaRecorder started");
      setIsRecording(true);
      setRecordingTime(0);

      // Update permission state to granted since we got access
      setPermissionState("granted");

      // Start timer
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error("=== Error accessing microphone ===");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Full error:", error);

      // Provide specific error messages
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        toast.error(
          "Microphone access denied. Please check browser permissions."
        );
        setShowPermissionHelp(true);
        setPermissionState("denied");
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        toast.error(
          "No microphone found. Please connect a microphone and try again."
        );
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        toast.error("Microphone is already in use by another application.");
      } else {
        toast.error(`Failed to access microphone: ${error.message}`);
        setShowPermissionHelp(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElementRef.current.play();
        setIsPlaying(true);
      }
    } else {
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.onerror = () => {
        toast.error("Failed to play audio");
        setIsPlaying(false);
      };

      audio.play();
      setIsPlaying(true);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/mp4",
      "audio/x-m4a",
      "audio/ogg",
    ];
    const allowedExtensions = [".mp3", ".wav", ".m4a", ".ogg"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      toast.error(
        "Invalid file type. Please upload .mp3, .wav, .m4a, or .ogg files."
      );
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10485760) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setIsUploading(true);
    try {
      const uploadedUrl = await uploadCardAudio(file);
      setAudioUrl(uploadedUrl);
      setAudioBlob(null);
      onAudioSave(uploadedUrl);
      toast.success("Audio uploaded successfully");
    } catch (error) {
      console.error("Error uploading audio:", error);
      toast.error("Failed to upload audio");
    } finally {
      setIsUploading(false);
    }
  };

  const saveRecording = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      // Convert blob to File
      const extension = audioBlob.type.includes("webm") ? "webm" : "wav";
      const file = new File([audioBlob], `recording.${extension}`, {
        type: audioBlob.type,
      });

      const uploadedUrl = await uploadCardAudio(file);
      setAudioUrl(uploadedUrl);
      setAudioBlob(null);
      onAudioSave(uploadedUrl);
      toast.success("Audio saved successfully");
    } catch (error) {
      console.error("Error saving audio:", error);
      toast.error("Failed to save audio");
    } finally {
      setIsUploading(false);
    }
  };

  const removeAudio = () => {
    if (audioUrl && audioUrl.startsWith("blob:")) {
      URL.revokeObjectURL(audioUrl);
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setIsPlaying(false);
    onAudioRemove?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}</label>

      <div className="flex flex-wrap items-center gap-2">
        {/* Recording controls */}
        {!audioUrl && !isRecording && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startRecording}
              disabled={disabled || isUploading}
              className="gap-2"
            >
              <Mic className="size-4" />
              Record
            </Button>

            <label>
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/ogg"
                onChange={handleFileUpload}
                disabled={disabled || isUploading}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isUploading}
                className="gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.currentTarget.previousElementSibling?.dispatchEvent(
                    new MouseEvent("click")
                  );
                }}
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Upload
              </Button>
            </label>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPermissionHelp(true)}
              disabled={disabled}
              className="gap-1 text-gray-500 hover:text-gray-700"
              title="Microphone help"
            >
              <Info className="size-4" />
            </Button>
          </>
        )}

        {/* Recording in progress */}
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-md">
              <div className="size-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-red-700">
                {formatTime(recordingTime)}
              </span>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
              className="gap-2"
            >
              <Square className="size-4" />
              Stop
            </Button>
          </div>
        )}

        {/* Playback and save controls */}
        {audioUrl && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={togglePlayback}
              disabled={disabled}
              className="gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="size-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Play
                </>
              )}
            </Button>

            {audioBlob && !currentAudioUrl && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={saveRecording}
                disabled={disabled || isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeAudio}
              disabled={disabled || isUploading}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>
        )}
      </div>

      {audioUrl && !audioBlob && (
        <p className="text-xs text-muted-foreground">Audio attached</p>
      )}

      {/* Permission state warning */}
      {!audioUrl && !isRecording && permissionState === "denied" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <Info className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">
              {isInIframe
                ? "Microphone not available in preview"
                : "Microphone access is blocked"}
            </p>
            <p className="text-xs text-red-700 mt-1">
              {isInIframe
                ? 'Recording is blocked when running in an iframe (preview mode). Please use the "Upload" button to add audio files, or test recording in a deployed version of your app.'
                : "You need to allow microphone access in your browser settings to record audio."}
            </p>
            {!isInIframe && (
              <button
                onClick={() => setShowPermissionHelp(true)}
                className="text-xs font-medium text-red-900 underline hover:text-red-700 mt-1 inline-block"
              >
                Show me how to enable it
              </button>
            )}
          </div>
        </div>
      )}

      {/* Debug info - show permission state (for granted/prompt) */}
      {!audioUrl &&
        !isRecording &&
        permissionState !== "unknown" &&
        permissionState !== "denied" && (
          <p className="text-xs text-muted-foreground">
            Mic permission:{" "}
            <span
              className={
                permissionState === "granted"
                  ? "text-green-600"
                  : "text-yellow-600"
              }
            >
              {permissionState}
            </span>
          </p>
        )}

      {/* Microphone permission help modal */}
      {showPermissionHelp && (
        <MicrophonePermissionHelp
          onClose={() => setShowPermissionHelp(false)}
        />
      )}
    </div>
  );
}
