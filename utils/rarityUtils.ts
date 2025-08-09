export const getRarityColor = (rarity: string): string => {
  switch (rarity) {
    case 'common': return '#8D6E63';
    case 'uncommon': return '#26A69A';
    case 'rare': return '#5C6BC0';
    case 'legendary': return '#D81B60';
    default: return '#8D6E63';
  }
};

export const getRarityLabel = (rarity: string): string => {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
};