import java.util.*;
import java.io.*;

//this class creates a character in RokaScape, or uploads an existing save file of a character
public class Character {
    //character name
    private String charName;
    private Area loc;
    //stats
    private int maxHp;
    private int hp;
    private int atk;
    private int str;
    private int def;
    private int wc;
    private int mine;
    private int fish;
    private int cook;
    private int gp;
    private int xp;
    private int lvl;
    //inventory
    private Item weapon;
    private Map<Item, Integer> inv;

    public Character() {
        Scanner console = new Scanner(System.in);
        
        this.lvl = 1;
        this.xp = 0;
        this.maxHp = 10;
        this.hp = 10;
        this.atk = 1;
        this.str = 1;
        this.def = 1;
        this.wc = 1;
        this.mine = 1;
        this.fish = 1;
        this.cook = 1;
        this.weapon = null;
        this.inv = new TreeMap<>();
    }

    public Character(String fileName) throws FileNotFoundException {
        File charFile = new File(fileName);
        Scanner scan = new Scanner(charFile);

        this.charName = scan.nextLine();
        this.lvl = Integer.parseInt(scan.nextLine());
        this.xp = Integer.parseInt(scan.nextLine());
        this.maxHp = Integer.parseInt(scan.nextLine());
        this.hp = maxHp;
        this.atk = Integer.parseInt(scan.nextLine());
        this.str = Integer.parseInt(scan.nextLine());
        this.def = Integer.parseInt(scan.nextLine());
        this.gp = Integer.parseInt(scan.nextLine());
        CharManager manage = new CharManager();
        this.weapon = manage.getItem(scan.nextLine());
        this.inv = new TreeMap<>();
        // this.cook = Integer.parseInt(scan.nextLine());
        // this.wc = Integer.parseInt(scan.nextLine());
        // this.fish = Integer.parseInt(scan.nextLine());
        // this.mine = Integer.parseInt(scan.nextLine());
        
        
        while (scan.hasNextLine()) {
            if (scan.nextLine().contains("END INVENTORY")) {
                break;
            }
            String itemName = scan.nextLine();
            Item item = manage.getItem(itemName);
            int count = Integer.parseInt(scan.nextLine());
            this.addToInv(item, count);
        }
    }

    public void setName(String name) {
        this.charName = name;
    }

    public void save(String fileName) throws FileNotFoundException {
        PrintStream out = new PrintStream(new File(fileName));
        
        out.println(charName);
        out.println(lvl);
        out.println(xp);
        out.println(maxHp);
        out.println(atk);
        out.println(str);
        out.println(def);
        out.println(gp);
        out.println(weapon);
        out.println("Inventory:");
        //INVENTORY ITEMS
        for (Item key : inv.keySet()) {
            out.println(key);
            out.println(inv.get(key));
        }
        out.println("END INVENTORY");
        // out.println(cook);
        // out.println(wc);
        // out.println(fish);
        // out.println(mine);
        
        out.close();
    }

    //END CREATION OF CHARACTER

    public String getName() {
        return this.charName;
    }

    public Area getLoc() {
        return this.loc;
    }

    public void setLoc(Area loc) {
        this.loc = loc;
    }

    public int getHp() {
        return this.hp;
    }

    public int getAtk() {
        return this.atk;
    }

    public int getStr() {
        return this.str;
    }

    public int getDef() {
        return this.def;
    }

    public String toString() {
        return this.charName;
    }

    public Map<Item, Integer> getInv() {
        return this.inv;
    }

    public void addToInv(Item item, int count) {
        if (this.inv.get(item) == null) {
            this.inv.put(item, count);
        } else {
            this.inv.put(item, this.inv.get(item) + count);
        }
       
    }

    public void gainXp(int amount) {
        this.xp += amount;
        System.out.println("You have gained " + amount + " xp.");
        if (this.xp > this.lvl * 100) {
            System.out.println("You are now level " + this.lvl + ". You have healed to full"
            + " and your stats have slightly improved.");
            this.lvl++;
            this.xp = 0;
            this.atk++;
            this.def++;
            this.str++;
            this.maxHp += 5;
            this.hp = this.maxHp;
        }
    }

    public void heroHit(int dmg) {
        if ((this.hp - dmg) > 0) {
            this.hp = this.hp - dmg;
        } else {
            this.hp = 0;
        }
    }

    public void characterDeath() {
        this.gp = this.gp / 2;
        this.hp = maxHp;
    }

    public void monsterKill(int hp) {
        System.out.println("You have gained " + hp + " gp.");
        this.gp += hp;
    }

    public void equipItem(String weapon) {
        if (this.weapon != null) {
            System.out.println("You currently have " + this.weapon + " equipped.");
        } else {
        }
        CharManager i = new CharManager();
        for (Item key : inv.keySet()) {
            if (key.toString().equals(i.getItem(weapon).toString())) {
                if (key.isWeapon() && !(key.equals(weapon))) {
                    if (this.weapon != null) {
                        this.atk -= this.weapon.getAtk();
                        this.str -= this.weapon.getStr();
                    }
                    System.out.println("Weapon equipped.");
                    this.weapon = key;
                    this.atk += this.weapon.getAtk();
                    this.str += this.weapon.getStr();
                } else if (key.isWeapon() && key.equals(weapon)) {
                    System.out.println("You already have that weapon equipped!");
                } else {
                    System.out.println("That is not a weapon!");
                }
                
            }
        }
    }

    public void unequipItem() {
        this.atk -= this.weapon.getAtk();
        this.str -= this.weapon.getStr();
        this.weapon = null;
        System.out.println("Weapon unequipped.");
    }

}
