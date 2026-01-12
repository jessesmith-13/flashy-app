/**
 * UnsplashAttribution Component
 *
 * Displays photographer credit for Unsplash images.
 * REQUIRED by Unsplash API production guidelines.
 *
 * Props:
 * - attribution: { photographerName, photographerUsername, photographerUrl, unsplashUrl }
 * - className: Optional CSS classes for positioning
 */

interface UnsplashAttributionProps {
  attribution: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
    unsplashUrl: string;
  };
  className?: string;
}

export function UnsplashAttribution({
  attribution,
  className = "",
}: UnsplashAttributionProps) {
  return (
    <div
      className={`text-xs opacity-70 hover:opacity-100 transition-opacity ${className}`}
      style={{ fontSize: "10px" }}
    >
      Photo by{" "}
      <a
        href={`${attribution.photographerUrl}?utm_source=flashy&utm_medium=referral`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        {attribution.photographerName}
      </a>{" "}
      on{" "}
      <a
        href={`${attribution.unsplashUrl}?utm_source=flashy&utm_medium=referral`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        Unsplash
      </a>
    </div>
  );
}
