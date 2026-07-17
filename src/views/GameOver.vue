<template>
  <div
    v-if="roomData"
    id="gameover"
    class="pimd-screen"
    :class="{
      'gameover--cancelled': roomData.outcome === 'cancelled',
      'gameover--won': roomData.outcome === 'won',
    }"
    aria-labelledby="gameover-title"
  >
    <div v-if="roomData.outcome === 'won'" class="gameover-confetti" aria-hidden="true">
      <i v-for="piece in 12" :key="piece" />
    </div>

    <section class="gameover-poster pimd-paper">
      <span class="pimd-tape gameover-poster__tape" aria-hidden="true" />
      <p class="pimd-eyebrow">
        {{ roomData.outcome === 'cancelled' ? 'Room closed' : 'Final score' }}
      </p>

      <h1 id="gameover-title">
        <template v-if="roomData.outcome === 'cancelled'">
          <span>Game</span>
          <span>cancelled</span>
        </template>
        <template v-else>
          <span class="gameover-title__name">{{ roomData.winner?.displayName }}</span>
          <span>won!</span>
        </template>
      </h1>

      <p id="final-rounds">The game lasted {{ roomData.rounds }} rounds.</p>
      <p class="gameover-poster__note">
        {{
          roomData.outcome === 'cancelled'
            ? 'No champion was crowned, but the receipts are still here.'
            : 'Officially the biggest Pain in my Deck! in the room.'
        }}
      </p>

      <div v-if="roomData.outcome === 'won'" class="gameover-winner-seal" aria-hidden="true">
        <span>Room<br />champ</span>
      </div>
    </section>

    <section class="gameover-standings" aria-labelledby="final-standings-title">
      <div class="gameover-standings__heading">
        <p class="pimd-eyebrow">The receipts</p>
        <h2 id="final-standings-title">Final standings</h2>
      </div>

      <ol id="final-leaderboard">
        <li
          v-for="(player, index) in roomData.leaderboard"
          :key="player.playerId"
          class="final-leaderboard_player"
          :class="{ 'final-leaderboard_player--winner': roomData.winner?.playerId === player.playerId }"
        >
          <div class="rank" :aria-label="`Rank ${index + 1}`">
            {{ index + 1 }}<sup>{{ getOrdinalSuffix(index + 1) }}</sup>
          </div>
          <div class="username">
            <strong>{{ player.displayName }}</strong>
            <span v-if="roomData.winner?.playerId === player.playerId">Room champion</span>
          </div>
          <div class="points">
            <strong>{{ player.points }}</strong>
            <span>{{ player.points === 1 ? 'point' : 'points' }}</span>
          </div>
        </li>
      </ol>

      <button type="button" class="pimd-primary-button gameover-leave" @click="router.replace('/')">
        Leave Game
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';

const router = useRouter();
const game = useGameStore();
const roomData = computed(() => game.room.finalRecord);

function getOrdinalSuffix(number: number): string {
  if (number === 1) return 'st';
  if (number === 2) return 'nd';
  if (number === 3) return 'rd';
  return 'th';
}
</script>

<style scoped>
#gameover {
  isolation: isolate;
  display: grid;
  gap: clamp(24px, 5vw, 52px);
  align-content: start;
  padding: clamp(28px, 6vw, 72px) clamp(16px, 6vw, 96px) 132px;
}

.gameover-poster,
.gameover-standings {
  z-index: 1;
  width: min(100%, 660px);
  margin-inline: auto;
}

.gameover-poster {
  min-height: 390px;
  padding: clamp(42px, 8vw, 70px) clamp(24px, 7vw, 48px) 42px;
  transform: rotate(-0.65deg);
}

.gameover-poster__tape {
  top: -6px;
  left: 50%;
  width: 82px;
  transform: translateX(-50%) rotate(-7deg);
}

.gameover-poster h1 {
  display: grid;
  gap: 5px;
  margin: 17px 0 25px;
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(3.7rem, 17vw, 7.25rem);
  font-weight: 400;
  line-height: 0.78;
  letter-spacing: -0.055em;
  text-transform: uppercase;
}

.gameover-title__name {
  max-width: 8ch;
  color: var(--pimd-primary-dark);
  font-size: 0.54em;
  line-height: 0.95;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}

#final-rounds {
  margin: 0;
  color: var(--pimd-ink);
  font-size: clamp(1rem, 4vw, 1.25rem);
  font-weight: 900;
}

.gameover-poster__note {
  max-width: 35ch;
  margin: 10px 130px 0 0;
  color: var(--pimd-ink-soft);
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.45;
}

.gameover-winner-seal {
  position: absolute;
  right: clamp(20px, 6vw, 42px);
  bottom: 18px;
  display: grid;
  place-content: center;
  width: 122px;
  height: 122px;
  transform: rotate(8deg);
  background: var(--pimd-ink);
  clip-path: polygon(
    50% 0,
    61% 34%,
    98% 35%,
    68% 56%,
    79% 92%,
    50% 70%,
    21% 92%,
    32% 56%,
    2% 35%,
    39% 34%
  );
  filter: drop-shadow(4px 5px 0 rgb(45 37 64 / 38%));
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-weight: 400;
  text-align: center;
  text-transform: uppercase;
}

.gameover-winner-seal::before {
  position: absolute;
  inset: 5px;
  background: var(--pimd-highlight);
  clip-path: inherit;
  content: '';
}

.gameover-winner-seal::after {
  position: absolute;
  top: 22px;
  left: 40px;
  width: 14px;
  height: 4px;
  transform: rotate(-35deg);
  border-radius: 999px;
  background: rgb(255 250 240 / 72%);
  content: '';
}

.gameover-winner-seal span {
  position: relative;
  z-index: 1;
  transform: translateY(-1px) rotate(-2deg);
  font-size: 0.8rem;
  line-height: 0.94;
  letter-spacing: -0.045em;
  white-space: nowrap;
}

.gameover-standings {
  padding: clamp(22px, 5vw, 34px);
  border: 4px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 8px 9px 0 var(--pimd-meta);
}

.gameover-standings__heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 13px;
  border-bottom: 3px solid var(--pimd-ink);
}

.gameover-standings__heading h2 {
  margin: 0;
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(1.15rem, 5vw, 1.7rem);
  font-weight: 400;
  line-height: 1;
  text-align: right;
  text-transform: uppercase;
}

#final-leaderboard {
  display: grid;
  gap: 12px;
  width: 100%;
  padding: 0;
  margin: 18px 0 0;
  list-style: none;
}

.gameover--won #final-leaderboard {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: 190px;
  gap: 12px 10px;
  align-items: end;
}

.final-leaderboard_player {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 72px;
  padding: 9px 12px 9px 8px;
  transform: rotate(0.2deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 4px 5px 0 var(--pimd-primary);
  color: var(--pimd-ink);
}

.final-leaderboard_player:nth-child(even) {
  transform: rotate(-0.25deg);
  box-shadow: 4px 5px 0 var(--pimd-highlight);
}

.final-leaderboard_player--winner {
  background: var(--pimd-highlight);
  box-shadow: 5px 6px 0 var(--pimd-primary-dark);
}

.gameover--won .final-leaderboard_player:nth-child(-n + 3) {
  --podium-accent: var(--pimd-paper-shadow);

  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 4px;
  justify-items: center;
  min-width: 0;
  min-height: 0;
  padding: 15px 8px 10px;
  overflow: hidden;
  background: var(--pimd-paper);
  box-shadow: 5px 7px 0 var(--podium-accent);
  text-align: center;
}

.gameover--won .final-leaderboard_player:nth-child(-n + 3)::before {
  position: absolute;
  inset: 0 0 auto;
  height: 9px;
  background: var(--podium-accent);
  content: '';
}

.gameover--won .final-leaderboard_player:nth-child(1) {
  --podium-accent: var(--pimd-primary);

  grid-column: 2;
  grid-row: 1;
  height: 100%;
  transform: rotate(-0.35deg);
  background: var(--pimd-highlight);
}

.gameover--won .final-leaderboard_player:nth-child(2) {
  --podium-accent: var(--pimd-sky);

  grid-column: 1;
  grid-row: 1;
  height: 77%;
  transform: rotate(0.45deg);
}

.gameover--won .final-leaderboard_player:nth-child(3) {
  --podium-accent: var(--pimd-meta);

  grid-column: 3;
  grid-row: 1;
  height: 64%;
  transform: rotate(-0.4deg);
}

.gameover--won .final-leaderboard_player:nth-child(n + 4) {
  grid-column: 1 / -1;
  box-shadow: 4px 5px 0 var(--pimd-paper-shadow);
}

.gameover--won .final-leaderboard_player:nth-child(-n + 3) .rank {
  grid-row: 2;
  align-self: center;
  font-size: clamp(2.4rem, 5vw, 3.5rem);
}

.gameover--won .final-leaderboard_player:nth-child(-n + 3) .username {
  grid-row: 1;
  width: 100%;
  justify-items: center;
}

.gameover--won .final-leaderboard_player:nth-child(-n + 3) .username strong {
  width: 100%;
  font-size: 0.92rem;
  text-align: center;
}

.gameover--won .final-leaderboard_player:nth-child(-n + 3) .points {
  grid-row: 3;
  min-width: 0;
  justify-items: center;
}

.gameover--won .final-leaderboard_player:nth-child(-n + 3) .points strong {
  font-size: 1.15rem;
}

.final-leaderboard_player .rank {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 2rem;
  line-height: 1;
}

.final-leaderboard_player .rank sup {
  margin: 1px 0 0 1px;
  font-family: 'Inter', sans-serif;
  font-size: 0.32em;
  font-weight: 900;
  line-height: 1;
}

.final-leaderboard_player .username {
  display: grid;
  min-width: 0;
}

.final-leaderboard_player .username strong {
  overflow: hidden;
  font-size: 1rem;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.final-leaderboard_player .username span {
  margin-top: 2px;
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 0.56rem;
  font-weight: 400;
  line-height: 1.2;
  text-transform: uppercase;
}

.final-leaderboard_player .points {
  display: grid;
  justify-items: end;
  min-width: 54px;
}

.final-leaderboard_player .points strong {
  font-family: 'Bungee', sans-serif;
  font-size: 1.35rem;
  font-weight: 400;
  line-height: 1;
}

.final-leaderboard_player .points span {
  margin-top: 3px;
  font-size: 0.65rem;
  font-weight: 900;
  text-transform: uppercase;
}

.gameover-leave {
  margin-top: 24px;
}

.gameover--cancelled .gameover-poster {
  background-color: var(--accent-100);
  filter: drop-shadow(7px 8px 0 rgb(200 63 49 / 24%));
}

.gameover--cancelled .gameover-poster h1 {
  color: var(--pimd-danger);
  font-size: clamp(2.3rem, 5vw, 3.8rem);
  line-height: 0.9;
  letter-spacing: -0.065em;
}

.gameover--cancelled .gameover-poster h1 span {
  max-width: 100%;
  white-space: nowrap;
}

.gameover--cancelled .gameover-poster__tape {
  background: rgb(255 214 74 / 88%);
}

.gameover--cancelled .gameover-poster__note {
  margin-right: 0;
}

.gameover-confetti {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.gameover-confetti i {
  position: absolute;
  width: 10px;
  height: 27px;
  transform: rotate(18deg);
  background: var(--pimd-highlight);
}

.gameover-confetti i:nth-child(3n) {
  background: var(--pimd-primary);
}

.gameover-confetti i:nth-child(3n + 2) {
  background: var(--pimd-meta);
}

.gameover-confetti i:nth-child(1) {
  top: 4%;
  left: 5%;
}

.gameover-confetti i:nth-child(2) {
  top: 14%;
  right: 7%;
}

.gameover-confetti i:nth-child(3) {
  top: 32%;
  left: 2%;
}

.gameover-confetti i:nth-child(4) {
  top: 48%;
  right: 2%;
}

.gameover-confetti i:nth-child(5) {
  top: 67%;
  left: 8%;
}

.gameover-confetti i:nth-child(6) {
  top: 78%;
  right: 9%;
}

.gameover-confetti i:nth-child(7) {
  top: 9%;
  left: 28%;
}

.gameover-confetti i:nth-child(8) {
  top: 25%;
  right: 27%;
}

.gameover-confetti i:nth-child(9) {
  bottom: 9%;
  left: 25%;
}

.gameover-confetti i:nth-child(10) {
  right: 30%;
  bottom: 4%;
}

.gameover-confetti i:nth-child(11) {
  top: 55%;
  left: 17%;
}

.gameover-confetti i:nth-child(12) {
  top: 60%;
  right: 15%;
}

@media (min-width: 900px) {
  #gameover {
    grid-template-columns: minmax(330px, 0.9fr) minmax(410px, 1.1fr);
    align-items: center;
    min-height: calc(100svh - var(--navbar-height));
  }

  .gameover-poster,
  .gameover-standings {
    width: 100%;
    max-width: none;
    margin: 0;
  }

  .gameover-poster {
    min-height: 470px;
  }
}

@media (max-width: 430px) {
  .gameover-poster__note {
    max-width: 22ch;
    margin-right: 104px;
  }

  .gameover-winner-seal {
    right: 17px;
    bottom: 22px;
    width: 102px;
    height: 102px;
  }

  .gameover-winner-seal span {
    font-size: 0.68rem;
  }

  .gameover-standings {
    padding-inline: 16px;
  }

  .gameover-standings__heading {
    display: grid;
    justify-items: start;
  }

  .gameover-standings__heading h2 {
    text-align: left;
  }

  .final-leaderboard_player {
    grid-template-columns: 42px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .gameover--won #final-leaderboard {
    grid-template-rows: 154px;
    gap: 10px 6px;
  }

  .gameover--won .final-leaderboard_player:nth-child(-n + 3) {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
    padding: 12px 4px 7px;
  }

  .gameover--won .final-leaderboard_player:nth-child(-n + 3) .rank {
    font-size: clamp(2rem, 12vw, 2.8rem);
  }

  .gameover--won .final-leaderboard_player:nth-child(-n + 3) .username strong {
    font-size: 0.75rem;
  }

  .gameover--won .final-leaderboard_player:nth-child(-n + 3) .username span {
    display: none;
  }

  .gameover--won .final-leaderboard_player:nth-child(-n + 3) .points strong {
    font-size: 0.95rem;
  }

  .gameover--won .final-leaderboard_player:nth-child(-n + 3) .points span {
    font-size: 0.52rem;
  }
}

@media (max-width: 899px) {
  .gameover-standings {
    justify-self: center;
    box-shadow: 0 9px 0 var(--pimd-meta);
  }
}

@media (forced-colors: active) {
  .gameover-poster,
  .gameover-standings,
  .final-leaderboard_player {
    border: 3px solid CanvasText;
    background: Canvas;
    color: CanvasText;
    filter: none;
    box-shadow: none;
  }
}
</style>
