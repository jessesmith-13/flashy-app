import { useState, useEffect, useMemo } from "react";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { ScrollArea } from "@/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import {
  MessageCircle,
  BookOpen,
  FileText,
  Trash2,
  RotateCcw,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { getDeletedItems, restoreDeletedItem } from "../../../utils/api/admin";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog";

interface DeletedComment {
  id: string;
  deckId: string;
  text: string;
  userId?: string;
  authorName: string;
  deletedBy: string;
  deletedByName: string;
  deletedReason: string;
  deletedAt: string;
  deckName?: string;
  content: string;
  userDisplayName: string;
  communityDeckName?: string;
  communityDeckEmoji?: string;
  deletedByDisplayName: string;
}

interface DeletedDeck {
  id: string;
  name: string;
  emoji: string;
  category: string;
  authorId?: string;
  authorName: string;
  deletedBy: string;
  deletedByName: string;
  deletedReason: string;
  deletedAt: string;
  cardCount?: number;
  ownerDisplayName: string;
}

interface DeletedCard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  authorId?: string;
  authorName?: string;
  deletedBy: string;
  deletedByName: string;
  deletedReason: string;
  deletedAt: string;
  deckName?: string;
  ownerDisplayName?: string;
  deckEmoji?: string;
}

interface DeletedItemsPanelProps {
  accessToken: string;
}

export function DeletedItemsPanel({ accessToken }: DeletedItemsPanelProps) {
  const [comments, setComments] = useState<DeletedComment[]>([]);
  const [decks, setDecks] = useState<DeletedDeck[]>([]);
  const [cards, setCards] = useState<DeletedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    type: "comment" | "deck" | "card";
    name: string;
  } | null>(null);

  useEffect(() => {
    loadDeletedItems();
  }, []);

  const loadDeletedItems = async () => {
    try {
      setLoading(true);
      const data = await getDeletedItems(accessToken);
      setComments(data.comments || []);
      console.log("deck DATA", data.decks);
      setDecks(data.decks || []);
      setCards(data.cards || []);
    } catch (error: any) {
      console.error("Failed to load deleted items:", error);
      toast.error(error.message || "Failed to load deleted items");
    } finally {
      setLoading(false);
    }
  };

  // Sort items by deletedAt (newest first)
  const sortedComments = useMemo(() => {
    return [...comments].sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  }, [comments]);

  const sortedDecks = useMemo(() => {
    return [...decks].sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  }, [decks]);

  const sortedCards = useMemo(() => {
    return [...cards].sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  }, [cards]);

  const handleRestoreClick = (
    id: string,
    type: "comment" | "deck" | "card",
    name: string
  ) => {
    setSelectedItem({ id, type, name });
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedItem) return;

    try {
      setRestoring(selectedItem.id);
      await restoreDeletedItem(accessToken, selectedItem.id, selectedItem.type);
      toast.success(
        `${
          selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)
        } restored successfully`
      );

      // Remove from the appropriate list
      if (selectedItem.type === "comment") {
        setComments(comments.filter((c) => c.id !== selectedItem.id));
      } else if (selectedItem.type === "deck") {
        setDecks(decks.filter((d) => d.id !== selectedItem.id));
      } else if (selectedItem.type === "card") {
        setCards(cards.filter((c) => c.id !== selectedItem.id));
      }

      setRestoreDialogOpen(false);
      setSelectedItem(null);
    } catch (error: any) {
      console.error("Failed to restore item:", error);
      toast.error(error.message || "Failed to restore item");
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const totalDeleted = comments.length + decks.length + cards.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-1">
            Deleted Items
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {totalDeleted} {totalDeleted === 1 ? "item" : "items"} deleted
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDeletedItems}
          disabled={loading}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {totalDeleted === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <h3 className="text-gray-700 dark:text-gray-300 mb-2">
            No Deleted Items
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            All clean! There are no deleted items to review.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="comments" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Comments ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="decks" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Decks ({decks.length})
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Cards ({cards.length})
            </TabsTrigger>
          </TabsList>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-4">
            <ScrollArea className="h-[500px] rounded-xl border border-gray-200 dark:border-gray-700">
              {sortedComments.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No deleted comments
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {sortedComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-gray-100 break-words">
                            {comment.content}
                          </p>
                          {comment.communityDeckName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Deck: {comment.communityDeckName}{" "}
                              {comment.communityDeckEmoji}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRestoreClick(comment.id, "comment", "Comment")
                          }
                          disabled={restoring === comment.id}
                          className="shrink-0"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                          <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-blue-700 dark:text-blue-300">
                            Author: {comment.userDisplayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trash2 className="w-3 h-3" />
                          <span>
                            Deleted by: {comment.deletedByDisplayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(comment.deletedAt)}</span>
                        </div>
                      </div>

                      {comment.deletedReason && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Reason:</span>{" "}
                                {comment.deletedReason}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Decks Tab */}
          <TabsContent value="decks" className="mt-4">
            <ScrollArea className="h-[500px] rounded-xl border border-gray-200 dark:border-gray-700">
              {sortedDecks.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No deleted decks
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {sortedDecks.map((deck) => (
                    <div
                      key={deck.id}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{deck.emoji}</span>
                            <h3 className="text-gray-900 dark:text-gray-100 truncate">
                              {deck.name}
                            </h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {deck.category}
                            </Badge>
                            {deck.cardCount !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                {deck.cardCount} cards
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRestoreClick(deck.id, "deck", deck.name)
                          }
                          disabled={restoring === deck.id}
                          className="shrink-0"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                          <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-blue-700 dark:text-blue-300">
                            Author: {deck.ownerDisplayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trash2 className="w-3 h-3" />
                          <span>Deleted by: {deck.deletedByName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(deck.deletedAt)}</span>
                        </div>
                      </div>

                      {deck.deletedReason && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Reason:</span>{" "}
                                {deck.deletedReason}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards" className="mt-4">
            <ScrollArea className="h-[500px] rounded-xl border border-gray-200 dark:border-gray-700">
              {sortedCards.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No deleted cards
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {sortedCards.map((card) => (
                    <div
                      key={card.id}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Question:
                            </p>
                            <p className="text-gray-900 dark:text-gray-100 break-words">
                              {card.front}
                            </p>
                          </div>
                          {card.deckName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Deck: {card.deckName} {card.deckEmoji}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRestoreClick(card.id, "card", "Card")
                          }
                          disabled={restoring === card.id}
                          className="shrink-0"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                        {card.ownerDisplayName && (
                          <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-blue-700 dark:text-blue-300">
                              Author: {card.ownerDisplayName}
                            </span>
                          </div>
                        )}
                        {!card.ownerDisplayName && (
                          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                            <User className="w-3 h-3" />
                            <span className="italic">Author unknown</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Trash2 className="w-3 h-3" />
                          <span>Deleted by: {card.deletedByName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(card.deletedAt)}</span>
                        </div>
                      </div>

                      {card.deletedReason && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Reason:</span>{" "}
                                {card.deletedReason}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore {selectedItem?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this {selectedItem?.type}? It
              will be visible to users again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreConfirm}
              disabled={restoring !== null}
              className="bg-green-600 hover:bg-green-700"
            >
              {restoring ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
