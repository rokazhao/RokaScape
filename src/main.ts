import { SAVE_KEY, createNewPlayer, deserializeSave } from './engine/state';
import { Game } from './engine/game';
import { GameUI } from './ui/app';
import { showTitleScreen } from './ui/modals';

const app = document.querySelector('#app') as HTMLElement;

function startGame(name: string, load: boolean): void {
  app.innerHTML = '';
  let game: Game;
  if (load) {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      try {
        game = new Game(deserializeSave(raw));
      } catch {
        game = new Game(createNewPlayer(name, 'lumbridge'));
      }
    } else {
      game = new Game(createNewPlayer(name, 'lumbridge'));
    }
  } else {
    localStorage.removeItem(SAVE_KEY);
    game = new Game(createNewPlayer(name, 'lumbridge'));
    game.player.name = name;
    game.save();
  }

  (window as unknown as { __game: Game }).__game = game;
  new GameUI(game, app);
}

app.appendChild(
  showTitleScreen((name, load) => {
    startGame(name, load);
  })
);
