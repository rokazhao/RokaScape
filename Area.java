import java.util.*;

public class Area {
    private String name;
    private List<NPC> npcs;
    private List<Monster> monsters;
    private static Map<String, Area> areaMap = new TreeMap<>();

    public Area(String name) {
        this.name = name;
        this.npcs = new ArrayList<>();
        this.monsters = new ArrayList<>();

        areaMap.put(name, this);
    }

    public static Area getAreaByName(String name) {
        return areaMap.get(name);
    }

    public void addNPC(NPC name) {
        npcs.add(name);
    }

    public void addMonster(Monster name) {
        monsters.add(name);
    }

    public List<NPC> getNpcs() {
        return this.npcs;
    }

    public List<Monster> getMonsters() {
        return this.monsters;
    }

    public String getName() {
        return this.name;
    }

    public String toString() {
        return this.name;
    }

}