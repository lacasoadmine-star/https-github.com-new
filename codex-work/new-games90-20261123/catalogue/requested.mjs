export const REQUESTED_NAMES = Object.freeze([
  'Multi Hot 5 Burn Wilds', 'Multi Hot 5 Super Wilds', 'Multi Hot 10', 'Multi Hot 20', 'Multi Hot 100',
  'Multi Hot Ways', 'Burning Ice', 'Burning Ice 10', 'Burning Ice 40', 'Hot Samba',
  'Safari Simba', 'Samurai', 'Vampires', 'Book of Win', 'Book of Futuria', 'Dark', 'Dark 100',
  'Magic Garden', 'Magic Garden 10', 'Magic Garden 40', 'Moonstone', 'Princess of Birds',
  'The Kingdom of The Elves', 'Evolution', 'Caravan of Riches', 'Wilds and Gods', 'Fruity Time',
  'Jungles', 'Blazing Hot 10', 'Blazing Hot 40', 'Cashino', 'Chilli Flame 7s', 'City Slot',
  'Crazy Mustang', 'Dota', 'Double Fruit', 'Egypt', "Genie's Bonanza", 'Golden Ball',
  'Happy New Year', "Joker's Wild", 'Madagascar', "Pharaoh's Coin", 'Summer Cocktail',
  'Sweet Kingdom', 'Wild Jungle', 'Zombies', 'JetX', 'JetX3', 'Next Level JetX', 'Helicopter X',
  'Football X', 'Cricket X', 'Plinko X', 'Plinko X Classic', 'Balloon', 'Mine Island',
  'Mine Island 2', 'Crash Duel X', 'Propel X', 'SplitX', 'PopX', 'World Champion X',
  'Cappadocia', 'Aviastar', 'Tower X', 'Hunter X', 'Roll X', 'Slicer X', 'Smash X',
  'Dr. Shocker', '4 Bonuses Bonanza', 'Fruit Roulette', 'European Roulette', 'American Roulette',
  'Personal Roulette', 'Virtual Burning Roulette', 'Virtual Classic Roulette', 'Blackjack',
  "Texas Hold'em Poker", 'Caribbean Stud Poker', 'Russian Poker', 'Joker Poker', 'Sic Bo',
  'Keno', 'Russian Keno', 'VIP Keno', 'Toto Keno', 'Bingo', 'Fortune Catch'
]);
export const EXCLUDED_NAMES = Object.freeze(['MultiHot5', 'FoxyHot20', 'HabeshaFortune5']);
export const canonicalName = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
