//Noah Zhao
//8/7/24
//RokaScape

import java.io.*;
import java.util.*;

//Runs RokaScape
public class Client {
    private static Map<String, Area> areas = new HashMap<>();
    CharManager c = new CharManager();

    // MAIN
    public static void main(String[] args) throws FileNotFoundException {
        Scanner console = new Scanner(System.in);
        System.out.println("Welcome to the world of Gielinor.");
        gameSetup();
        Character hero = loadCharacter(console);
        System.out.println("------------------------------");
        System.out.println("Suddenly, the world around you changes.");
        System.out.println("You find yourself at " + hero.getLoc() + ".");
        System.out.println("------------------------------");

        while (true) {
            hero.save(hero.getName() + ".txt");
            callAction(console, hero);
            System.out.println("*Game has auto-saved. Press enter to continue, or type 'q' to quit.*");
            String input = console.nextLine();
            if (input.equals("q")) {
                break;
            }
        }

    }

    // GAME SETUP (LOADING CHARACTERS, ITEMS, NPCS, MONSTERS)
    public static void gameSetup() {

        // Items
        Item goldBar = new Item("Gold Bar", 100, false, false, false);
        Item junk = new Item("Junk", 0, false, false, false);
        // Weapons
        Item bronzeSword = new Item("Bronze Sword", 15, true, false, false);
        bronzeSword.setStats(5, 5);
        Item slimySword = new Item("Slimy Sword", 100, true, false, true);
        slimySword.setStats(7, 7);
        Item goblinSword = new Item("Goblin Sword", 200, true, false, false);
        goblinSword.setStats(2, 5);
        Item goblinMace = new Item("Goblin Mace", 1000, true, false, false);
        goblinMace.setStats(5, 20);
        Item goblinClub = new Item("Goblin Club", 10000, true, false, false);
        goblinClub.setStats(15, 30);
        Item runeScim = new Item("Rune Scimitar", 5000, true, false, true);
        runeScim.setStats(20, 20);

        // Food
        Item shrimp = new Item("Shrimp", 5, false, true, true);
        shrimp.setHp(5);
        Item trout = new Item("Trout", 10, false, true, true);
        trout.setHp(10);
        Item rawBeef = new Item("Raw Beef", 5, false, true, false);
        rawBeef.setHp(5);
        Item goblinMeat = new Item("Goblin Meat", 5, false, true, false);
        goblinMeat.setHp(10);

        // NPCs
        NPC hans = new NPC("Hans", 1);
        hans.addDialogue("weather", "It sure is nice out, isn't it?");
        hans.addDialogue("threaten", "EEEEK! Don't hurt me!");
        NPC chef = new NPC("Chef", 2);
        chef.addDialogue("how to cook", "I'd teach you how to cook but it hasn't been added yet.");

        // Monsters
        Monster cow = new Monster("Cow", 8, 1, 1, 1, 1);
        dropSet(cow, rawBeef, 0, 1);
        Monster goblin = new Monster("Goblin", 5, 1, 1, 1, 2);
        dropSet(goblin, junk, 0, 50);
        dropSet(goblin, goblinSword, 51, 75);
        Monster goblinGeneral = new Monster("Grubeater", 50, 10, 10, 10, 3);
        dropSet(goblinGeneral, junk, 0, 32);
        dropSet(goblinGeneral, goblinSword, 32, 40);
        dropSet(goblinGeneral, goblinMace, 41, 46);
        dropSet(goblinGeneral, goblinClub, 47, 48);
        goblinGeneral.setDrop(goblinSword, 5);
        goblinGeneral.setDrop(goblinClub, 6);

        // Areas
        Area lumbridge = new Area("Lumbridge");
        lumbridge.addMonster(cow);
        lumbridge.addMonster(goblin);
        lumbridge.addMonster(goblinGeneral);
        lumbridge.addNPC(hans);
        lumbridge.addNPC(chef);

        Area varrock = new Area("Varrock");

        areas.put(lumbridge.getName(), lumbridge);
        areas.put(varrock.getName(), varrock);
    }

    // this class creates the character, or loads a character from a save file
    public static Character loadCharacter(Scanner console) throws FileNotFoundException {

        Character hero = null;
        String choice = "";

        while (!choice.equals("1") && !choice.equals("2")) {

            System.out.println("Type 1 to create a new hero. Type 2 to load a preexisting hero's save file.");
            choice = console.nextLine();

            if (choice.equals("1")) {
                hero = new Character();
                System.out.println("What is the name of your hero?");
                String heroName = console.nextLine();
                hero.setName(heroName);
                hero.setLoc(areas.get("Lumbridge"));
                hero.save(heroName + ".txt");
            } else if (choice.equals("2")) {
                System.out.println("What is the name of your hero?");
                String heroName = console.nextLine() + ".txt";
                File charFile = new File(heroName);
                if (charFile.exists()) {
                    hero = new Character(heroName);
                    hero.setLoc(areas.get("Lumbridge"));
                    break;
                } else {
                    throw new FileNotFoundException("The file " + heroName + " is not an existing hero's save file.");
                }
            } else {
                System.out.println("Invalid choice, please try again.");
            }
        }
        return hero;
    }

    // Presents a menu of options of choices the player can make
    public static void callAction(Scanner console, Character hero) {
        System.out.println("What would you like to do next?");
        System.out.println("------------------------------");
        System.out.println("1: Observe");
        System.out.println("2: Shop");
        System.out.println("3: Travel");
        System.out.println("------------------------------");
        String choice = console.nextLine();

        if (choice.equals("1")) {
            observe(console, hero);
        } else if (choice.equals("2")) {
            shop(console, hero);
        } else if (choice.equals("3")) {
            travel(console, hero);
        } else {
            System.out.println("Invalid choice, please try again.");
            System.out.println("------------------------------");
            callAction(console, hero);
        }
    }

    // OBSERVING A LOCATION
    public static void observe(Scanner console, Character hero) {
        System.out.println("------------------------------");
        System.out.println("You observe " + hero.getLoc() + ".");
        System.out.println("------------------------------");
        // Additional observation logic can go here

        List<NPC> npcs = hero.getLoc().getNpcs();
        List<Monster> monsters = hero.getLoc().getMonsters();

        if (npcs.isEmpty()) {
            System.out.println("There are no NPCs here.");
        } else {
            System.out.println("NPCs:");
            for (NPC npc : npcs) {
                System.out.println("- " + npc.getName());
            }
        }

        if (monsters.isEmpty()) {
            System.out.println("There are no monsters here.");
        } else {
            System.out.println("Monsters:");
            for (Monster monster : monsters) {
                System.out.println("- " + monster.getName());
            }
        }
        System.out.println("What would you like to do next?");
        System.out.println("------------------------------");
        System.out.println("1: Talk to NPC");
        System.out.println("2: Fight Monster");
        System.out.println("3: Equip Weapon");
        System.out.println("------------------------------");
        String choice = console.nextLine();
        if (choice.equals("1")) {
            System.out.println("------------------------------");
            System.out.println("Which NPC would you like to talk to?");
            System.out.println("------------------------------");
            talk(console, hero);
        } else if (choice.equals("2")) {
            System.out.println("------------------------------");
            System.out.println("What monster would you like to fight?");
            System.out.println("------------------------------");
            fight(console, hero);
        } else if (choice.equals("3")) {
            equip(console, hero);
        } else {
            System.out.println("------------------------------");
            System.out.println("Invalid choice, please try again.");
            System.out.println("------------------------------");
        }
    }

    // BUYING ITEMS
    public static void shop(Scanner console, Character hero) {
        System.out.println("------------------------------");
        System.out.println("Would you like to (1) buy or (2) sell or (3) leave?");
        String choice = console.next();
        if (choice.equals("1")) {
            buyItem(console, hero);
        } else if (choice.equals("2")) {
            sellItem(console, hero);
        } else if (choice.equals("3")) {

        } else {
            System.out.println("Invalid input, please try again.");
            shop(console, hero);
        }
    }

    //helper method for shop, for buying items
    public static void buyItem(Scanner console, Character hero) {
        System.out.println("------------------------------");
        System.out.println("You can purchase items using GP obtained from killing monsters and selling items.");
        System.out.println("What item would you like to buy?");
        CharManager c = new CharManager();
        int itemCount = 0;
        for (String itemName : c.getAllItems().keySet()) {
            Item item = c.getAllItems().get(itemName);
            if (item.isSold()) {
                itemCount++; 
                if (item.isWeapon()) {
                    System.out.println(itemCount + ": " + itemName + " - " + item.getValue() + 
                    " | Atk: " + item.getAtk() + ", Str: " + item.getStr());
                } else {
                    System.out.println(itemCount + ": " + itemName + " - " + item.getValue());
                }
            }
        }
        System.out.println((itemCount + 1) + ": leave");
        System.out.println("------------------------------");
        int choice = Integer.parseInt(console.next());
        if (choice != itemCount + 1) {
            itemCount = 1;
            for (String itemName : c.getAllItems().keySet()) {
                Item item = c.getAllItems().get(itemName);
                if (item.isSold()) {
                    if (itemCount == choice) {
                        //check if player has enough GP
                        if (item.getValue() > hero.getGP()) {
                            System.out.println("You don't have enough GP for this purchase!");
                            break;
                        }
                        System.out.println("You have purchased a " + item + ". You now have " + hero.getGP() + " GP.");
                        hero.addToInv(item, 1);
                        hero.loseGP(item.getValue());
                        break;
                    } else {
                        itemCount++;
                    }
                } 
            }
        }
    }

    //helper method for shop, for selling items
    public static void sellItem(Scanner console, Character hero) {
        System.out.println("------------------------------");
        System.out.println("Selling an item grants you 50% of its value in GP.");
        System.out.println("What item would you like to sell?");
        int itemCount = 0;
        for (Item item : hero.getInv().keySet()) {
            itemCount++;
            System.out.println(itemCount + ": " + item + " - " + item.getValue() + "GP, x" + hero.getInv().get(item));
        }
        System.out.println((itemCount + 1) + ": leave");
        System.out.println("------------------------------");
        int choice = Integer.parseInt(console.next());
        if (choice != itemCount + 1) {
            itemCount = 1;
            for (Item item : hero.getInv().keySet()) {

                if (itemCount == choice) {
                    //CHECK CASE OF BEING AN EQUIPPED WEAPON
                    if (item.equals(hero.getWep()) && hero.getInv().get(item) == 1) {
                        System.out.println(item + " is currently equipped. You cannot sell it at this time.");
                        break;
                    }
                    hero.lowerItemValue(item);
                    hero.gainGP(item.getValue() / 2);
                    System.out.println(item + " has been sold. You now have " + hero.getGP() + " GP.");
                    break;
                } else {
                    itemCount++;
                }
            }
        }

    }

    // TRAVELING PLACES
    public static void travel(Scanner console, Character hero) {
        System.out.println("Where would you like to travel to?");

    }

    // FIGHTING MONSTERS
    public static void fight(Scanner console, Character hero) {
        Random r = new Random();
        Area a = hero.getLoc();
        Monster curr = null;
        int count = 1;

        // getting a list of the monsters
        for (int i = 0; i < a.getMonsters().size(); i++) {
            System.out.println(count + ": " + a.getMonsters().get(i));
            count++;
        }

        // choosing what monster to fight
        int choice = Integer.parseInt(console.nextLine());
        for (int i = 0; i < a.getMonsters().size(); i++) {
            if (choice == (a.getMonsters().get(i).getOrder())) {
                curr = a.getMonsters().get(i);
                System.out.println("------------------------------");
                System.out.println("You approach an unsuspecting " + curr + ".");
            }
        }

        // looping battle until hero or monster dies
        while (curr.getHp() > 0 && hero.getHp() > 0) {

            // YOU ATTACKING
            System.out.println("------------------------------");
            System.out.println("Would you like to (1) Attack, or (2) Eat?");
            String attackOrEat = console.nextLine();

            if (attackOrEat.equals("1")) {
                System.out.println("------------------------------");
                System.out.println("You attack the " + curr + ".");
                int hitChance = r.nextInt(hero.getAtk() + 1);
                int defChance = r.nextInt(curr.getDef() + 1);
                if (hitChance >= defChance) {
                    int hitPower = r.nextInt(hero.getStr() + 1);
                    System.out.println("- You hit a " + hitPower + ".");
                    hero.gainXp(hitPower);
                    // MONSTER DIES, YOU GET A DROP
                    if (curr.getHp() - hitPower <= 1) {
                        System.out.print("The " + curr + " dies. ");
                        Item drop = curr.getDrop(r.nextInt(curr.getDropRange()));
                        System.out.println("You receive a " + drop + ".");
                        System.out.println("------------------------------");
                        hero.monsterKill(curr.getMaxHp());
                        hero.addToInv(drop, 1);
                        curr.monsterRespawn();
                        break;
                    } else {
                        curr.monsterHit(hitPower);
                    }
                } else {
                    System.out.println("- You miss.");
                }
                System.out.println("The " + curr + " now has " + curr.getHp() + " HP.");
            } else if (attackOrEat.equals("2")) {
                eatFood(console, hero);
            } else {
                System.out.println("- You picked an invalid choice and stayed immobile, allowing the"
                        + " " + curr.getName() + " to hit you.");

            }

            // THEM ATTACKING
            System.out.println("The " + curr + " attacks back.");
            int monsterHitChance = r.nextInt(curr.getAtk() + 1);
            int monsterDefChance = r.nextInt(hero.getDef() + 1);
            if (monsterHitChance >= monsterDefChance) {
                int hitPower = r.nextInt(curr.getStr() + 1);
                System.out.println("- The " + curr.getName() + " hits a " + hitPower + ".");

                if (hero.getHp() - hitPower <= 0) {
                    // YOU DYING
                    System.out.print("You have passed out due to fatigue and find yourself in " +
                            hero.getLoc() + ". ");
                    break;
                } else {
                    hero.heroHit(hitPower);
                    System.out.println("You now have " + hero.getHp() + "HP.");
                }
            } else {
                System.out.println("- The " + curr + " misses.");
            }
            System.out.println("------------------------------");
            System.out.println("Type 'r' to run or press Enter to continue.");
            String input = console.nextLine();
            // RUNNING AWAY
            if (input.equals("r")) {
                System.out.println("You manage to get away from the " + curr + ".");
                System.out.println();
                curr.monsterRespawn();
                break;
            }

        }
    }

    // TALKING TO NPCS
    public static void talk(Scanner console, Character hero) {
        Area a = hero.getLoc();

        int count = 0;
        for (int i = 0; i < a.getNpcs().size(); i++) {
            count++;
            System.out.println(count + ": " + a.getNpcs().get(i));
        }
        int choice = Integer.parseInt(console.nextLine());
        for (int i = 0; i < a.getNpcs().size(); i++) {
            if (choice == (a.getNpcs().get(i).getOrder())) {
                NPC curr = a.getNpcs().get(i);
                System.out.println("You talk to " + curr + ".");
                System.out.println("What would you like to say?");
                int options = curr.getDialogueOptions();
                choice = Integer.parseInt(console.nextLine());
                // checking dialogue options
                int newCount = 0;
                for (String opt : curr.getDialogues().keySet()) {
                    newCount++;
                    if (choice == newCount) {
                        curr.speak(opt);
                    }
                }
            }
        }
    }

    // EQUIPPING WEAPONS
    public static void equip(Scanner console, Character hero) {
        if (hero.containsWeapon()) {
            System.out.println("What weapon do you want to equip?");
            System.out.println("---------------------------------");
            int itemCount = 0;
            for (Item item : hero.getInv().keySet()) {
                if (item.isWeapon()) {
                    itemCount++;
                    System.out.println(itemCount + ": " + item);
                }
            }

            int weaponChoice = Integer.parseInt(console.nextLine());
            itemCount = 1;
            for (Item item : hero.getInv().keySet()) {
                if (weaponChoice == itemCount && item.isWeapon()) {
                    hero.equipItem(item.getName());
                    break;
                } else if (item.isWeapon()) {
                    itemCount++;
                }
            }
        } else {
            System.out.println("You have no weapons to equip!");
        }

    }

    // HELPER METHOD (SETTING DROPRATES FOR MONSTERS)
    public static void dropSet(Monster monster, Item item, int lowerCount, int higherCount) {
        for (int i = lowerCount; i < higherCount + 1; i++) {
            monster.setDrop(item, i);
        }
    }

    // EATING FOOD (FOR MID BATTLE)
    public static void eatFood(Scanner console, Character hero) {
        int itemCount = 0;
        if (hero.containsFood()) {
            System.out.println("------------------------------");
            System.out.println("What food do you want to eat?:");
            System.out.println("------------------------------");

            for (Item item : hero.getInv().keySet()) {
                if (item.isFood()) {
                    itemCount++;
                    System.out.println(itemCount + ": " + item + " (" + item.getHp() + ")");
                }
            }
            int choice = Integer.parseInt(console.nextLine());
            itemCount = 1;
            for (Item item : hero.getInv().keySet()) {
                if (choice == itemCount && item.isFood()) {
                    hero.lowerItemValue(item);
                    int newHp = (item.getHp() + hero.getHp());
                    if (newHp > hero.getMaxHp()) {
                        newHp = hero.getMaxHp();
                    }
                    System.out.println(item + " has been eaten. You are now " + newHp + " HP.");

                    hero.heroHit(item.getHp() * -1);

                } else if (item.isFood()) {
                    itemCount++;
                }
            }
        } else {
            System.out.println("You reach into your bag but you have no food!");
            System.out.println("------------------------------");
        }

    }
}