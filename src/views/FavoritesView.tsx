import React from 'react';
import { FavoritesList } from '../components/favorites/FavoritesList';

export const FavoritesView: React.FC = () => {
  return (
    <div className="space-y-6">
      <FavoritesList />
    </div>
  );
};
