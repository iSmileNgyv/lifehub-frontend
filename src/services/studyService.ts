import { api } from '@/lib/api';
import type { Card, CardTemplate, Deck, Rating, StudyCard, TemplateField } from '@/types';

interface DeckPayload {
  name: string;
  description?: string | null;
  template_uid?: string | null;
}

interface CardPayload {
  front?: string;
  back?: string;
  front_image?: string | null;
  back_image?: string | null;
  fields?: Record<string, string> | null;
}

export const deckService = {
  list: () => api<{ data: Deck[] }>('/study/decks'),
  create: (data: DeckPayload) => api<Deck>('/study/decks', { method: 'POST', body: JSON.stringify(data) }),
  update: (uid: string, data: DeckPayload) => api<Deck>(`/study/decks/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (uid: string) => api<{ message: string }>(`/study/decks/${uid}`, { method: 'DELETE' }),
};

export const cardService = {
  list: (deck: string) => api<{ data: Card[] }>(`/study/decks/${deck}/cards`),
  create: (deck: string, data: CardPayload) => api<Card>(`/study/decks/${deck}/cards`, { method: 'POST', body: JSON.stringify(data) }),
  update: (deck: string, uid: string, data: CardPayload) => api<Card>(`/study/decks/${deck}/cards/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (deck: string, uid: string) => api<{ message: string }>(`/study/decks/${deck}/cards/${uid}`, { method: 'DELETE' }),
};

interface TemplatePayload {
  name: string;
  description?: string | null;
  ai_instruction?: string | null;
  fields: TemplateField[];
  display?: import('@/types').TemplateDisplay | null;
}

export const templateService = {
  list: () => api<{ data: CardTemplate[] }>('/study/templates'),
  create: (data: TemplatePayload) => api<CardTemplate>('/study/templates', { method: 'POST', body: JSON.stringify(data) }),
  update: (uid: string, data: TemplatePayload) => api<CardTemplate>(`/study/templates/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (uid: string) => api<{ message: string }>(`/study/templates/${uid}`, { method: 'DELETE' }),
  sample: (uid: string) => api<{ fields: Record<string, string> | null; front: string | null; back: string | null }>(`/study/templates/${uid}/sample`),
};

export interface AiBulkResult {
  word: string;
  fields: Record<string, string>;
  error: string | null;
}

export const aiService = {
  generate: (template: string, word: string, only?: string[]) =>
    api<{ fields: Record<string, string> }>(`/study/templates/${template}/generate`, { method: 'POST', body: JSON.stringify(only && only.length ? { word, only } : { word }) }),
  generateBulk: (template: string, words: string[], only?: string[]) =>
    api<{ results: AiBulkResult[] }>(`/study/templates/${template}/generate-bulk`, { method: 'POST', body: JSON.stringify(only && only.length ? { words, only } : { words }) }),
};

export interface StudySettings {
  mode: 'learning' | 'flashcard';
  ext_mode: 'learning' | 'flashcard';
  study_deck_uid: string | null;
  active_from: string;
  active_to: string;
  study_enabled: boolean;
  interval_min: number;
  cards_per_push: number;
  ext_enabled: boolean;
  ext_rotate_sec: number;
  ext_notify: boolean;
  ext_notify_min: number;
}

export const studyService = {
  queue: (deck: string) => api<{ data: StudyCard[] }>(`/study/decks/${deck}/queue`),
  answer: (deck: string, card: string, rating: Rating) =>
    api<{ due: string; interval: number }>(`/study/decks/${deck}/cards/${card}/answer`, { method: 'POST', body: JSON.stringify({ rating }) }),
  settings: () => api<StudySettings>('/study/settings'),
  saveSettings: (data: StudySettings) => api<StudySettings>('/study/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
