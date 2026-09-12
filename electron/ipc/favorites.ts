import { ipcMain } from 'electron';
import type { Favorite } from '../types';
import { deleteFavorite, getFavorites, saveFavorite } from '../services/storage';

export function registerFavoritesHandlers(): void {
  ipcMain.handle('favorites:list', async (): Promise<Favorite[]> => {
    return getFavorites();
  });

  ipcMain.handle('favorites:save', async (_event, fav: Favorite): Promise<Favorite[]> => {
    return saveFavorite(fav);
  });

  ipcMain.handle('favorites:delete', async (_event, id: string): Promise<Favorite[]> => {
    return deleteFavorite(id);
  });
}
