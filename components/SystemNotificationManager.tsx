
import React, { useEffect } from 'react';
import { App } from '@capacitor/app';
import { scheduleMotivationalNotifications, schedulePeriodicSummary, getGMTDateString } from '../services/notificationService';
import { Book, Language } from '../types';
import { storageService } from '../services/storageService';

interface Props {
  lang: Language;
  notifLang: Language;
  books: Book[];
}

export const SystemNotificationManager: React.FC<Props> = ({ lang, notifLang, books }: Props) => {
  useEffect(() => {
    const handleExit = async () => {
      const today = getGMTDateString(); // GMT-based
      // Refresh books from storage to get the latest session time saved by Reader
      const latestBooks = storageService.getBooks();

      // Calculate ACTUAL reading time today (only counted when user reads in Reader)
      const todayReadingSeconds = latestBooks.reduce((acc: number, b: Book) => {
        if (b.lastReadDate === today) return acc + (b.dailyTimeSeconds || 0);
        return acc;
      }, 0);
      const todayMins = Math.floor(todayReadingSeconds / 60);

      // Calculate last session minutes accurately from the book that was just read
      const lastSessionSeconds = latestBooks.reduce((acc: Book | null, b: Book) => {
        // We find the book with the most recent lastReadAt and use its sessionTimeSeconds
        if (b.lastReadAt && (!acc || b.lastReadAt > (acc.lastReadAt || 0))) return b;
        return acc;
      }, null as Book | null)?.sessionTimeSeconds || 0;
      
      const lastSessionMins = Math.floor(lastSessionSeconds / 60);

      const totalMins = Math.floor(latestBooks.reduce((acc: number, b: Book) => acc + (b.timeSpentSeconds || 0), 0) / 60);
      const totalStars = latestBooks.reduce((acc: number, b: Book) => acc + (b.stars || 0), 0);

      // Book breakdown for today - only books that were actually read
      const bookBreakdown = latestBooks
        .filter((b: Book) => b.lastReadDate === today && (b.dailyTimeSeconds || 0) > 0)
        .map((b: Book) => ({ title: b.title, mins: Math.floor((b.dailyTimeSeconds || 0) / 60), stars: b.stars || 0 }))
        .sort((a, b) => (b.mins || 0) - (a.mins || 0));

      // Get habit data for streak
      const habitData = storageService.getHabitData();

      const stats = { 
        lastSessionMins,
        todayMins,
        totalMins,
        totalStars,
        totalBooks: latestBooks.length,
        bookBreakdown,
        streak: habitData.streak
      };

      // Schedule motivational notifications (with contextual intensity)
      await scheduleMotivationalNotifications(notifLang, stats);

      // Schedule periodic summaries (48h + weekly) if due
      if (storageService.shouldRegenerateSummary('48h')) {
        storageService.generateAnalyticsSummary('48h');
      }
      if (storageService.shouldRegenerateSummary('weekly')) {
        storageService.generateAnalyticsSummary('weekly');
      }
      await schedulePeriodicSummary(notifLang, stats);
    };

    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        handleExit();
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [lang, books]);

  // ── AUTO-GENERATE ANALYTICS ON MOUNT ──
  useEffect(() => {
    // Generate initial analytics if none exist
    if (storageService.shouldRegenerateSummary('48h')) {
      storageService.generateAnalyticsSummary('48h');
    }
    if (storageService.shouldRegenerateSummary('weekly')) {
      storageService.generateAnalyticsSummary('weekly');
    }
    
    // Set up periodic regeneration check (every 30 minutes)
    const interval = setInterval(() => {
      if (storageService.shouldRegenerateSummary('48h')) {
        storageService.generateAnalyticsSummary('48h');
      }
      if (storageService.shouldRegenerateSummary('weekly')) {
        storageService.generateAnalyticsSummary('weekly');
      }
    }, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return null;
};
