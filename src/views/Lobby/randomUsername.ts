const ADJECTIVES = [
  'Brave',
  'Buzzy',
  'Cozy',
  'Dandy',
  'Dizzy',
  'Fancy',
  'Jolly',
  'Lucky',
  'Merry',
  'Peppy',
  'Quick',
  'Sassy',
  'Silly',
  'Sunny',
  'Swift',
  'Witty',
  'Zany',
] as const;

const ANIMALS = [
  'Badger',
  'Beaver',
  'Bison',
  'Corgi',
  'Ferret',
  'Gecko',
  'Heron',
  'Koala',
  'Llama',
  'Moose',
  'Otter',
  'Panda',
  'Puffin',
  'Raven',
  'Robin',
  'Shark',
  'Tiger',
  'Toucan',
  'Yak',
] as const;

const RANDOM_USERNAMES = ADJECTIVES.flatMap((adjective) =>
  ANIMALS.map((animal) => `${adjective} ${animal}`),
);

export function generateRandomUsername(
  takenNames: readonly string[],
  random: () => number = Math.random,
): string {
  const taken = new Set(takenNames.map((name) => name.trim().toLowerCase()));
  const startIndex = Math.floor(random() * RANDOM_USERNAMES.length);

  for (let offset = 0; offset < RANDOM_USERNAMES.length; offset += 1) {
    const candidate = RANDOM_USERNAMES[(startIndex + offset) % RANDOM_USERNAMES.length];
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }

  throw new Error('No random usernames are available.');
}
