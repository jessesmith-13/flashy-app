// api/friends.ts

import { API_BASE } from "@/supabase/runtime";

// ============================================================
// FRIENDS – REQUESTS
// ============================================================

export const sendFriendRequest = async (
  accessToken: string,
  friendId: string
) => {
  const response = await fetch(`${API_BASE}/friends/request/${friendId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to send friend request:", data.error);
    throw new Error(data.error || "Failed to send friend request");
  }

  return data;
};

export const acceptFriendRequest = async (
  accessToken: string,
  requestId: string
) => {
  const response = await fetch(`${API_BASE}/friends/accept/${requestId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to accept friend request:", data.error);
    throw new Error(data.error || "Failed to accept friend request");
  }

  return data;
};

export const declineFriendRequest = async (
  accessToken: string,
  requestId: string
) => {
  const response = await fetch(`${API_BASE}/friends/decline/${requestId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to decline friend request:", data.error);
    throw new Error(data.error || "Failed to decline friend request");
  }

  return data;
};

// ============================================================
// FRIENDS – LISTS
// ============================================================

export const getFriends = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/friends`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }

    console.error("Failed to fetch friends:", data.error);
    throw new Error(data.error || "Failed to fetch friends");
  }

  return data.friends;
};

export const getFriendRequests = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/friends/requests`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }

    console.error("Failed to fetch friend requests:", data.error);
    throw new Error(data.error || "Failed to fetch friend requests");
  }

  return data.requests;
};

export const getPendingFriendRequests = async (accessToken: string) => {
  const response = await fetch(`${API_BASE}/friends/pending`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }

    console.error("Failed to fetch pending friend requests:", data.error);
    throw new Error(data.error || "Failed to fetch pending friend requests");
  }

  return (
    data.pending?.map(
      (p: {
        userId: string;
        displayName: string;
        avatarUrl: string | null;
        createdAt: string;
        status: string;
      }) => p.userId
    ) || []
  );
};

// ============================================================
// FRIENDS – MUTATIONS
// ============================================================

export const removeFriend = async (accessToken: string, friendId: string) => {
  const response = await fetch(`${API_BASE}/friends/${friendId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to remove friend:", data.error);
    throw new Error(data.error || "Failed to remove friend");
  }

  return data;
};
