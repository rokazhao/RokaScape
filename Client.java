import java.io.*;
import java.util.*;

public class Client {
    private static Map<String, Area> areas = new HashMap<>();
    public static void main(String[] args) throws FileNotFoundException {
        Scanner console = new Scanner(System.in);
        System.out.println("Welcome to the world of Gielinor.");
        gameSetup();
        Character hero = loadCharacter(console);
        System.out.println("Suddenly, the world around you changes.");
        System.out.println("You find yourself at " + hero.getLoc() + ".");
        
        while (true) {
            hero.save(hero.getName() + ".txt");
            callAction(console, hero);
            System.out.println("Type 'quit' to exit or press Enter to continue.");
            String input = console.nextLine();
            if (input.equals("quit")) {
                break;
            }
        }

    }

    public static void gameSetup() {

        // Items
        Item goldBar = new Item("Gold Bar", 100, false);
        Item junk = new Item("Junk", 0, false);
        Item bronzeSword = new Item("Bronze Sword", 15, true);
        bronzeSword.setStats(5, 5);
        Item goblinSword = new Item("Goblin Sword", 200, true);
        goblinSword.setStats(10, 10);
        Item goblinClub = new Item("Goblin Club", 10000, true);
        goblinClub.setStats(25, 25);

        Item bronzePick = new Item("Bronze pickaxe", 10, false);
        Item bronzeAxe = new Item("Bronze axe", 10, false);
        Item fishRod = new Item("Fishing Rod", 10, false);
        
        // NPCs
        NPC hans = new NPC("Hans", 1);
        hans.addDialogue("weather", "It sure is nice out, isn't it?");
        hans.addDialogue("threaten", "EEEEK! Don't hurt me!");
        NPC chef = new NPC("Chef", 2);
        chef.addDialogue("how to cook", "I'd teach you how to cook but it hasn't been added yet.");

        // Monsters
        Monster cow = new Monster("Cow", 8, 1, 1, 1, 1);
        Monster goblin = new Monster("Goblin", 5, 1, 1, 1, 2);
            dropSet(goblin, junk, 20);
            goblin.setDrop(goblinSword, 21);
        Monster goblinGeneral = new Monster("Grubeater", 50, 10, 10, 10, 3);
            dropSet(goblinGeneral, junk, 4);
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
        int choice = 0;

        while (choice != 1 && choice != 2) {

            System.out.println("Type 1 to create a new hero. Type 2 to load a preexisting hero's save file.");
            choice = Integer.parseInt(console.nextLine());

            if (choice == 1) {
                hero = new Character();
                System.out.println("What is the name of your hero?");
                String heroName = console.nextLine();
                hero.setName(heroName);
                hero.setLoc(areas.get("Lumbridge"));
                hero.save(heroName + ".txt");
            } else if (choice == 2) {
                System.out.println("What is the name of your hero?");
                String heroName = console.nextLine() + ".txt";
                File charFile = new File(heroName);
                if (charFile.exists()) {
                    hero = new Character(heroName);
                    hero.setLoc(areas.get("Lumbridge"));
                    break;
                } else {
                    System.out.println("Save file not found for hero: " + heroName);
                    choice = 0;
                }
                hero = new Character(heroName);
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
        System.out.println("2: Travel");
        int choice = Integer.parseInt(console.nextLine());

        if (choice == 1) {
            observe(console, hero);
        } else if (choice == 2) {
            travel(console, hero);
        } else {
            System.out.println("Invalid choice, please try again.");
        }
    }

    public static void observe(Scanner console, Character hero) {
        System.out.println("You observe " + hero.getLoc() + ".");
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
        int choice = Integer.parseInt(console.nextLine());
        if (choice == 1) {
            System.out.println("Which NPC would you like to talk to?");
            talk(console, hero);
        } else if (choice == 2) {
            System.out.println("What monster would you like to fight?");
            fight(console, hero);
        } else if (choice == 3) {
            equip(console, hero);
        } else {
            System.out.println("Invalid choice, please try again.");
        }
    }

    //TRAVELING PLACES
    public static void travel(Scanner console, Character hero) {
        System.out.println("Where would you like to travel to?");
        // Additional travel logic can go here
    }

    //FIGHTING MONSTERS
    public static void fight(Scanner console, Character hero) {
        Random r = new Random();
        Area a = hero.getLoc();
        Monster curr = null;
        int count = 1;
        for (int i = 0; i < a.getNpcs().size() + 1; i++) {
            System.out.println(count + ": " + a.getMonsters().get(i));
            count++;
        }
        
        int choice = Integer.parseInt(console.nextLine());
        for (int i = 0; i < a.getMonsters().size(); i++) {
            if (choice == (a.getMonsters().get(i).getOrder())) {
                curr = a.getMonsters().get(i);
                System.out.println("You approach an unsuspecting " + curr + ".");
            }
        }
        
        while (curr.getHp() > 0 && hero.getHp() > 0) {
            //YOU ATTACKING
            System.out.println("You attack the " + curr + ".");
            int hitChance = r.nextInt(hero.getAtk() + 1);
            int defChance = r.nextInt(curr.getDef() + 1);
            if (hitChance >= defChance) {
                int hitPower = r.nextInt(hero.getStr() + 1);
                hero.gainXp(hitPower);
                System.out.println("You hit a " + hitPower + ".");
                if (curr.getHp() - hitPower <= 1) {
                    System.out.print("The " + curr + " dies. ");
                    Item drop = curr.getDrop(r.nextInt(curr.getDropRange()));
                    System.out.println("You receive a " + drop + ".");
                    hero.monsterKill(curr.getMaxHp());
                    hero.addToInv(drop, 1);
                    curr.monsterRespawn();
                    break;
                } else {
                    curr.monsterHit(hitPower);
                }
            } else {
                System.out.println("You miss.");
            }
            System.out.println("The " + curr + " now has " + curr.getHp() + " HP.");
            //THEM ATTACKING
            System.out.println("The " + curr + " attacks back.");
            int monsterHitChance = r.nextInt(curr.getAtk() + 1);
            int monsterDefChance = r.nextInt(hero.getDef() + 1);
            if (monsterHitChance >= monsterDefChance) {
                int hitPower = r.nextInt(curr.getStr() + 1);
                System.out.println("The monster hits a " + hitPower + ".");
                if (hero.getHp() - hitPower <= 0) {
                    System.out.print("You have passed out due to fatigue and find yourself in " + 
                    hero.getLoc() + ". ");
                    break;
                } else {
                    hero.heroHit(hitPower);
                    System.out.println("You now have " + hero.getHp() + "HP.");
                }
            } else {
                System.out.println("The " + curr + " misses.");
            }
            System.out.println("Type 'run' to run or press Enter to continue.");
            String input = console.nextLine();
            if (input.equals("run")) {
                System.out.println("You manage to get away from the " + curr + ".");
                System.out.println();
                break;
            }
        }
    }

    //TALKING TO NPCS
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
                //checking dialogue options
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

    public static void equip(Scanner console, Character hero) {
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
            if (weaponChoice == itemCount) {
                hero.equipItem(item.getName());
            } else {
                itemCount++;
            }
        }
    }

    public static void dropSet(Monster monster, Item item, int count) {
        for (int i = 0; i < count + 1; i++) {
            monster.setDrop(item, i);
        }
    }

}