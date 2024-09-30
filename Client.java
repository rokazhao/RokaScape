//Noah Zhao
//8/7/24
//RokaScape

import java.io.*;
import java.util.*;

//Runs RokaScape
public class Client {
    private static Map<String, Area> areas = new TreeMap<>();

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
        Item steelSword = new Item("Steel Sword", 250, true, false, true);
        steelSword.setStats(5, 8);
        Item addySword = new Item("Adamant Sword", 1000, true, false, false);
        addySword.setStats(10, 14);
        Item runeSword = new Item("Rune Sword", 4000, true, false, false);
        runeSword.setStats(16, 21);
        Item excalibur = new Item("Excalibur", 20000, true, false, false);
        excalibur.setStats(50, 50);
        Item steelKnuckles = new Item("Steel Knuckles", 250, true, false, true);
        steelKnuckles.setStats(2, 15);
        Item addyKnuckles = new Item("Adamant Knuckles", 1000, true, false, true);
        addyKnuckles.setStats(4, 30);
        Item runeKnuckles = new Item("Rune Knuckles", 4000, true, false, true);
        runeKnuckles.setStats(10, 60);
        Item arcaneStaff = new Item("Arcane Staff", 20000, true, false, false);
        arcaneStaff.setStats(100, 25);

        // Food
        Item shrimp = new Item("Shrimp", 5, false, true, true);
        shrimp.setHp(5);
        Item trout = new Item("Trout", 10, false, true, true);
        trout.setHp(10);
        Item shark = new Item("Shark", 50, false, true, true);
        shark.setHp(20);
        Item manta = new Item("Manta Ray", 100, false, true, true);
        manta.setHp(30);
        Item rawBeef = new Item("Raw Beef", 5, false, true, false);
        rawBeef.setHp(5);
        Item goblinMeat = new Item("Goblin Meat", 5, false, true, false);
        goblinMeat.setHp(10);
        Item varrockRations = new Item("Varrock Rations", 20, false, true, false);
        varrockRations.setHp(20);
        Item wizardGrub = new Item("Wizard Grub", 50, false, true, false);
        wizardGrub.setHp(30);


        // NPCs
        NPC hans = new NPC("Hans", 1);
        hans.addDialogue("Weather", "It sure is nice out, isn't it?");
        hans.addDialogue("Threaten", "EEEEK! Don't hurt me!");
        NPC chef = new NPC("Chef", 2);
        chef.addDialogue("How to cook", "I'd teach you how to cook but it hasn't been added yet.");
        NPC kingRoald = new NPC("King Roald", 1);
        kingRoald.addDialogue("Greet", "Welcome to Varrock, adventurer! I am King Roald.");

        // Monsters
        Monster cow = new Monster("Cow", 8, 1, 1, 1, 1);
        dropSet(cow, rawBeef, 0, 1);
        Monster goblin = new Monster("Goblin", 5, 1, 1, 1, 2);
        dropSet(goblin, goblinMeat, 0, 50);
        dropSet(goblin, goblinSword, 51, 75);
        Monster goblinGeneral = new Monster("Grubeater", 50, 10, 10, 10, 3);
        dropSet(goblinGeneral, goblinMeat, 0, 32);
        dropSet(goblinGeneral, goblinSword, 32, 40);
        dropSet(goblinGeneral, goblinMace, 41, 46);
        dropSet(goblinGeneral, goblinClub, 47, 48);
        Monster varrockGuard = new Monster("Varrock Guard", 25, 5, 5, 5, 1);
        dropSet(varrockGuard, varrockRations, 0, 32);
        dropSet(varrockGuard, steelSword, 32, 40);
        dropSet(varrockGuard, addySword, 40, 42);
        dropSet(varrockGuard, runeSword, 42, 43);
        Monster varrockArcher = new Monster("Varrock Archer", 20, 10, 2, 1, 2);
        dropSet(varrockArcher, varrockRations, 0, 32);
        dropSet(varrockArcher, steelKnuckles, 32, 40);
        dropSet(varrockArcher, addyKnuckles, 40, 42);
        dropSet(varrockArcher, runeKnuckles, 42, 43);
        Monster varrockGeneral = new Monster("Sir Lancelot", 100, 25, 20, 20, 3);
        dropSet(varrockGeneral, varrockRations, 0, 16);
        dropSet(varrockGeneral, addySword, 16, 32);
        dropSet(varrockGeneral, runeSword, 32, 36);
        dropSet(varrockGeneral, excalibur, 36, 37);
        Monster evilWizard = new Monster("Surok Magis", 250, 50, 50, 5, 4);
        dropSet(evilWizard, wizardGrub, 0, 90);
        dropSet(evilWizard, arcaneStaff, 90, 92);

        // Areas
        Area lumbridge = new Area("Lumbridge");
        lumbridge.addMonster(cow);
        lumbridge.addMonster(goblin);
        lumbridge.addMonster(goblinGeneral);
        lumbridge.addNPC(hans);
        lumbridge.addNPC(chef);

        Area varrock = new Area("Varrock");
        varrock.addNPC(kingRoald);
        varrock.addMonster(varrockGuard);
        varrock.addMonster(varrockArcher);
        varrock.addMonster(varrockGeneral);
        varrock.addMonster(evilWizard);

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

    // helper method for shop, for buying items
    public static void buyItem(Scanner console, Character hero) {
        System.out.println("------------------------------");
        System.out.println("You can purchase items using GP obtained from killing monsters and selling items.");
        System.out.println("What would you like to buy?");
        System.out.println("1: Food");
        System.out.println("2: Weapons");
        String itemChoice = console.next();
        System.out.println("------------------------------");
        int itemCount = 0;
        if (itemChoice.equals("1")) {
            itemCount = 0;
            for (Item item : Item.getItemsSortedByValue()) {
                if (item.isSold() && item.isFood()) {
                    itemCount++;
                    System.out.println(itemCount + ": " + item + " - " + item.getValue());
                }
            }
            System.out.println((itemCount + 1) + ": leave");
        } else if (itemChoice.equals("2")) {
            itemCount = 0;
            for (Item item : Item.getItemsSortedByValue()) {
                if (item.isSold() && item.isWeapon()) {
                    itemCount++;
                    System.out.println(itemCount + ": " + item + " - " + item.getValue() +
                            " | Atk: " + item.getAtk() + ", Str: " + item.getStr());
                }
            }
            System.out.println((itemCount + 1) + ": leave");
        }
        
        
        System.out.println("------------------------------");
        int choice = Integer.parseInt(console.next());
        if (choice <= itemCount + 1) {
            System.out.println("How many would you like to buy?");
            int amount = Integer.parseInt(console.next());
            itemCount = 1;
            if (itemChoice.equals("1")) {
                for (Item item : Item.getItemsSortedByValue()) {
                    if (item.isSold() && item.isFood()) {
                        if (itemCount == choice) {
                            // check if player has enough GP
                            if ((item.getValue() * amount) > hero.getGP()) {
                                System.out.println("You don't have enough GP for this purchase!");
                                break;
                            }
                            hero.loseGP(item.getValue() * amount);
                            System.out.println("------------------------------");
                            System.out.println("You have purchased " + amount + " " + item + ". You now have "
                                    + hero.getGP() + " GP.");
                            hero.addToInv(item, amount);
                            break;
                        } else {
                            itemCount++;
                        }
                    }
                }
            } else if (itemChoice.equals("2")) {
                for (Item item : Item.getItemsSortedByValue()) {
                    if (item.isSold() && item.isWeapon()) {
                        if (itemCount == choice) {
                            // check if player has enough GP
                            if ((item.getValue() * amount) > hero.getGP()) {
                                System.out.println("You don't have enough GP for this purchase!");
                                break;
                            }
                            hero.loseGP(item.getValue() * amount);
                            System.out.println("------------------------------");
                            System.out.println("You have purchased " + amount + " " + item + ". You now have "
                                    + hero.getGP() + " GP.");
                            hero.addToInv(item, amount);
                            break;
                        } else {
                            itemCount++;
                        }
                    }
                }
            } 
        } else {
            System.out.println("You leave the shop.");
        }
    }

    // helper method for shop, for selling items
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

        if (choice <= itemCount + 1) {
            System.out.println("How many would you like to sell?");
            int amount = Integer.parseInt(console.next());
            itemCount = 1;
            for (Item item : hero.getInv().keySet()) {

                if (itemCount == choice) {
                    // if the amount to be sold is greater than count, sell all
                    if (hero.getInv().get(item) < amount) {
                        amount = hero.getInv().get(item);
                    }
                    // CHECK CASE OF BEING AN EQUIPPED WEAPON
                    if ((item.equals(hero.getWep()) && hero.getInv().get(item) == 1)
                            || item.equals(hero.getWep()) && amount == hero.getInv().get(item)) {
                        System.out.println(item + " is currently equipped. You cannot sell it at this time.");
                        break;
                    }
                    hero.lowerItemValue(item, amount);
                    hero.gainGP((item.getValue() * amount) / 2);
                    System.out.println(amount + " " + item + " have been sold. You now have " +
                            hero.getGP() + " GP.");
                    break;
                } else {
                    itemCount++;
                }
            }
        } else {
            System.out.println("You leave the shop.");
        }

    }

    // TRAVELING PLACES
    public static void travel(Scanner console, Character hero) {
        System.out.println("Where would you like to travel to?");
        int areaCount = 0;
        for (String areaName : areas.keySet()) {
            areaCount++;
            System.out.println(areaCount + ": " + areaName);
        }

        int loc = Integer.parseInt(console.nextLine());
        areaCount = 1;
        for (String areaName : areas.keySet()) {
            Area area = areas.get(areaName);
            if (areaCount == loc && hero.getLoc() != area) {
                System.out.println("You are now in " + area.toString() + ".");
                hero.setLoc(area);
                break;
            } else if (areaCount == loc && hero.getLoc() == area) {
                System.out.println("You are already in " + hero.getLoc() + ".");
                break;
            } else {
                areaCount++;
            }
        }

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
        //heal to full before fight
        hero.setHp(hero.getMaxHp());

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
                    System.out.println("You have passed out due to fatigue and find yourself in " +
                            hero.getLoc() + ", with only half your money. ");
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
                        System.out.println("------------------------------");
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
            if (hero.getWep() != null) {
                System.out.println((itemCount + 1) + ": Unequip weapon");
            }
            System.out.println("------------------------------");

            int weaponChoice = Integer.parseInt(console.nextLine());

            if (hero.getWep() != null) {
                if (weaponChoice == itemCount + 1) {
                    hero.unequipItem();
                }
            }

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
            Iterator<Item> iterator = hero.getInv().keySet().iterator();

            while (iterator.hasNext()) {
                Item iteratedItem = iterator.next();
                if (choice == itemCount && iteratedItem.isFood()) {
                    int newHp = (iteratedItem.getHp() + hero.getHp());
                    if (newHp > hero.getMaxHp()) {
                        newHp = hero.getMaxHp();
                    }
                    System.out.println(iteratedItem + " has been eaten. You are now " + newHp + " HP.");
                    hero.heroHit(iteratedItem.getHp() * -1);

                    if (hero.getInv().get(iteratedItem) == 1) {
                        iterator.remove();
                    } else {
                        hero.lowerItemValue(iteratedItem, 1);
                    }
                    
                } else if (iteratedItem.isFood()) {
                    itemCount++;
                }
            }
        } else {
            System.out.println("You reach into your bag but you have no food!");
            System.out.println("------------------------------");
        }

    }
}