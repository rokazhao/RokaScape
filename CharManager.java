import java.util.*;

public class CharManager {
    // Map to store items by their name
    private Map<String, Item> itemMap = new TreeMap<>();
    private Map<String, Monster> monsterMap = new HashMap<>();
    private Map<String, Area> areaMap = new HashMap<>();

    public CharManager() {
        // Create and add items to the map

        Item shrimp = new Item("Shrimp", 5, false, true, true);
        shrimp.setHp(5);
        Item trout = new Item("Trout", 10, false, true, true);
        trout.setHp(10);
        Item rawBeef = new Item("Raw Beef", 5, false, true, false);
        rawBeef.setHp(5);
        Item goblinMeat = new Item("Goblin Meat", 5, false, true, false);
        goblinMeat.setHp(10);

        Item goldBar = new Item("Gold Bar", 100, false, false, false);
        Item junk = new Item("Junk", 0, false, false, false);
        Item bronzeSword = new Item("Bronze Sword", 15, true, false, false);
        bronzeSword.setStats(5, 5);
        Item slimySword = new Item("Slimy Sword", 100, true, false, false);
        slimySword.setStats(7, 7);
        Item goblinSword = new Item("Goblin Sword", 200, true, false, false);
        goblinSword.setStats(2, 5);
        Item goblinMace = new Item("Goblin Mace", 1000, true, false, false);
        goblinMace.setStats(5, 20);
        Item goblinClub = new Item("Goblin Club", 10000, true, false, false);
        goblinClub.setStats(15, 30);
        Item runeScim = new Item("Rune Scimitar", 5000, true, false, true);
        runeScim.setStats(20, 20);

        
        itemMap.put(rawBeef.getName(), rawBeef);
        itemMap.put(shrimp.getName(), shrimp);
        itemMap.put(trout.getName(), trout);
        itemMap.put(goblinMeat.getName(), goblinMeat);
        itemMap.put(goldBar.getName(), goldBar);
        itemMap.put(junk.getName(), junk);
        itemMap.put(bronzeSword.getName(), bronzeSword);
        itemMap.put(goblinSword.getName(), goblinSword);
        itemMap.put(goblinClub.getName(), goblinClub);
        itemMap.put(goblinMace.getName(), goblinMace);
        itemMap.put(runeScim.getName(), runeScim);
    }

    // Method to get an item by its name
    public Item getItem(String name) {
        return itemMap.get(name);
    }

    // Method to get a monster by its name
    public Monster getMonster(String name) {
        return monsterMap.get(name);
    }

    // Method to get an area by its name
    public Area getArea(String name) {
        return areaMap.get(name);
    }

    // Method to get all items
    public Map<String, Item> getAllItems() {
        return itemMap;
    }
}