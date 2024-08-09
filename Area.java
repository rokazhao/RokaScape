import java.util.*;

public class Area {
    private String name;
    private List<NPC> npcs;
    private List<Monster> monsters;

    public Area(String name) {
        this.name = name;
        this.npcs = new ArrayList<>();
        this.monsters = new ArrayList<>();
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