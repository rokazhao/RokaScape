import { createNewPlayer, deleteSlot, listSaveSlots, readSlot, writeSlot } from './engine/state';
import { Game } from './engine/game';
import { GameUI } from './ui/app';
import { showTitleScreen, type TitleChoice } from './ui/modals';

const app = document.querySelector('#app') as HTMLElement;

function startGame(choice: TitleChoice): void {
  app.innerHTML = '';

  let game: Game;
  if (choice.newName) {
    const player = createNewPlayer(choice.newName, 'lumbridge');
    writeSlot(choice.slot, player);
    game = new Game(player, choice.slot);
  } else {
    const player = readSlot(choice.slot);
    if (!player) {
      // The slot emptied out from under us; back to character select.
      showCharacterSelect();
      return;
    }
    game = new Game(player, choice.slot);
  }

  (window as unknown as { __game: Game }).__game = game;
  new GameUI(game, app);
}

function showCharacterSelect(): void {
  app.innerHTML = '';
  app.appendChild(
    showTitleScreen(
      (choice) => startGame(choice),
      () => listSaveSlots(),
      (slot) => deleteSlot(slot)
    )
  );
}

showCharacterSelect();
