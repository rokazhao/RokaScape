import java.util.*;

public class CharManager {
    // Map to store items by their name
    private Map<String, Item> itemMap = new HashMap<>();
    private Map<String, Monster> monsterMap = new HashMap<>();
    private Map<String, Area> areaMap = new HashMap<>();

    public CharManager() {
        // Create and add items to the map
        Item goldBar = new Item("Gold Bar", 100, false);
        Item junk = new Item("Junk", 0, false);
        Item bronzeSword = new Item("Bronze Sword", 15, true);
        bronzeSword.setStats(5, 5);
        Item goblinSword = new Item("Goblin Sword", 200, true);
        goblinSword.setStats(10, 10);
        Item goblinClub = new Item("Goblin Club", 10000, true);
        goblinClub.setStats(25, 25);
        
        itemMap.put(goldBar.getName(), goldBar);
        itemMap.put(junk.getName(), junk);
        itemMap.put(bronzeSword.getName(), bronzeSword);
        itemMap.put(goblinSword.getName(), goblinSword);
        itemMap.put(goblinClub.getName(), goblinClub);
    }

    // Method to get an item by its name
    public Item getItem(String name) {
        return itemMap.get(name);
    }

    public Monster getMonster(String name) {
        return monsterMap.get(name);
    }

    public Area getArea(String name) {
        return areaMap.get(name);
    }

    // Method to get all items
    public Map<String, Item> getAllItems() {
        return itemMap;
    }
}