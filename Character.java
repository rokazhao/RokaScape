import java.util.*;
import java.io.*;

//this class creates a character in RokaScape, or uploads an existing save file of a character
public class Character {
    // character name
    private String charName;
    private Area loc;
    // stats
    private int maxHp;
    private int hp;
    private int atk;
    private int str;
    private int def;
    private int gp;
    private int xp;
    private int lvl;
    // inventory
    private Item weapon;
    private Map<Item, Integer> inv;

    // CHARACTER CONSTRUCTOR (NEW CHARACTER)
    public Character() {
        Scanner console = new Scanner(System.in);

        this.lvl = 1;
        this.xp = 0;
        this.maxHp = 10;
        this.hp = 10;
        this.atk = 1;
        this.str = 1;
        this.def = 1;
        this.weapon = null;
        this.inv = new TreeMap<>();
    }

    // CHARACTER CONSTRUCTOR (OLD CHARACTER)
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
        scan.nextLine();

        while (scan.hasNextLine()) {
            String itemName = scan.nextLine();
            if (itemName.equals("END INVENTORY")) {
                break;
            }
            Item item = manage.getItem(itemName);
            int count = Integer.parseInt(scan.nextLine());
            this.addToInv(item, count);
        }
    }

    // SAVE METHOD FOR LOADING OLD CHARACTER
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
        // INVENTORY ITEMS
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

    // SETS CHARACTERS NAME
    public void setName(String name) {
        this.charName = name;
    }

    // END CREATION OF CHARACTER

    // ADDS ITEM TO CHARACTER INVENTORY
    public void addToInv(Item item, int count) {
        if (this.inv.get(item) == null) {
            this.inv.put(item, count);
        } else {
            this.inv.put(item, this.inv.get(item) + count);
        }

    }

    // CHECKS INVENTORY FOR FOOD
    // - true: inventory contains food
    // - false: does not contain food
    public boolean containsFood() {
        for (Item item : inv.keySet()) {
            if (item.isFood()) {
                return true;
            }
        }
        return false;
    }

    // CHECKS INVENTORY FOR WEAPONS
    // - true: inventory contains weapons
    // - false: does not contain weapons
    public boolean containsWeapon() {
        for (Item item : inv.keySet()) {
            if (item.isWeapon()) {
                return true;
            }
        }
        return false;
    }
    
    // CHARACTER GAINS XP (BATTLE SEQUENCE)
    public void gainXp(int amount) {
        this.xp += amount;
        System.out.println("- You have gained " + amount + " xp.");
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

    // CHARACTER DAMAGED (BATTLE SEQUENCE)
    public void heroHit(int dmg) {
        if ((this.hp - dmg) > 0) {
            this.hp = this.hp - dmg;
        } else {
            this.hp = 0;
        }
    }

    // CHARACTER DIES, LOSES HALF OF GOLD
    public void characterDeath() {
        this.gp = this.gp / 2;
        this.hp = maxHp;
    }

    // KILLING MONSTER, GAINING THEIR HP IN GOLD
    public void monsterKill(int hp) {
        System.out.println("You have gained " + hp + " gp.");
        this.gp += hp;
    }

    // EQUIPPING A WEAPON
    public void equipItem(String newWeapon) {
        if (this.weapon != null) {
            System.out.println("You currently have " + this.weapon + " equipped.");
        }
        CharManager i = new CharManager();
        for (Item key : inv.keySet()) {
            if (this.weapon != null) {
                // break
                if (key.getName().equals(i.getItem(newWeapon).toString())) {
                    if (key.isWeapon() && !(key.toString().equals(this.weapon.toString()))) {
                        if (this.weapon != null) {
                            this.atk -= this.weapon.getAtk();
                            this.str -= this.weapon.getStr();
                        }
                        System.out.println(key + " equipped.");
                        this.weapon = key;
                        this.atk += this.weapon.getAtk();
                        this.str += this.weapon.getStr();
                        break;
                    } else if (key.isWeapon() && key.toString().equals(this.weapon.toString())) {
                        System.out.println("You already have that weapon equipped!");
                    } else {
                        System.out.println("That is not a weapon!");
                        break;
                    }

                }
            } else {
                System.out.println(key + " equipped.");
                this.weapon = key;
                this.atk += this.weapon.getAtk();
                this.str += this.weapon.getStr();
                break;
            }

        }
    }

    public void unequipItem() {
        this.atk -= this.weapon.getAtk();
        this.str -= this.weapon.getStr();
        this.weapon = null;
        System.out.println("Weapon unequipped.");
    }

    // USING A PIECE OF FOOD/ITEM
    public void lowerItemValue(Item key) {
        int currentCount = inv.get(key);
        inv.put(key, currentCount - 1);
        if (inv.get(key) == 0) {
            inv.remove(key);
        }
    }

    //GETTER METHODS

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

    public int getMaxHp() {
        return this.maxHp;
    }

    public Map<Item, Integer> getInv() {
        return this.inv;
    }

    public String toString() {
        return this.charName;
    }
}
