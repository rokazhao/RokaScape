import java.util.*;

public class Monster {
    private Random rand;
    private String name;
    private int maxHp;
    private int hp;
    private int atk;
    private int str;
    private int def;
    private int order;
    private Item drop;
    private Map<Integer, Item> dropTable;

    public Monster(String name, int maxHp, int atk, int str, int def, int order) {
        this.name = name;
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.atk = atk;
        this.str = str;
        this.order = order;
        this.dropTable = new TreeMap<>();
    }

    public String getName() {
        return this.name;
    }

    //returns attack of the monster, used to calculate if its attacks will hit
    public int getAtk() {
        return this.atk; 
    }
    
    //returns strength of the monster, used to calculate its max hit
    public int getStr() {
        return this.str;
    }

    //returns defense of the monster, used to calculate if attacks will be blocked or not
    public int getDef() {
        return this.def;
    }

    public int getHp() {
        return this.hp;
    }

    //returns hp of the monster
    public int getMaxHp() {
        return this.maxHp;
    }

    public int getOrder() {
        return this.order;
    }

    //reflects damage dealt to a monster
    public void monsterHit(int dmg) {
        if ((this.hp - dmg) > 0) {
            this.hp = this.hp - dmg;
        } else {
            this.hp = 0;
        }
    }

    public void monsterRespawn() {
        this.hp = this.maxHp;
    }

    public Item getDrop(int roll) {
        Item currentDrop = null;
        int rollNum = 0;
        for (Integer num : dropTable.keySet()) {
            if (roll == num) {
                currentDrop = dropTable.get(num);
            }
            
        }
        return currentDrop; // No drop
    }

    //returns the range of drops from a monster
    public int getDropRange() {
        int range = -1;
        for (Integer num : dropTable.keySet()) {
            range++;
        }
        return range;
    }

    public void setDrop(Item name, int roll) {
        dropTable.put(roll, name);
    }

    public String toString() {
        return this.name;
    }


}