type Props = {
  show: boolean;
};

export function CommunityDecksSectionHeader({ show }: Props) {
  if (!show) return null;

  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Decks
      </h2>
    </div>
  );
}
