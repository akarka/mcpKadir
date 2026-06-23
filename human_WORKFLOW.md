# Başka projelerde mcpKadir'i çağırma ve editleme akışı

İki ayrı şey var ve karışan tam burası:
1. **Çağırma** — bir projenin mcpKadir'in server'larını/skill'lerini *kullanması*.
2. **Editleme** — başka bir projede çalışırken mcpKadir'in kendisini *değiştirmek*.

Anahtar kavram: submodule bir **kopya değildir**. Tüketen reponun içine yerleşmiş, mcpKadir'in
**gerçek bir klonudur**. Tüketen repo sadece "hangi commit'teyim" diye bir **işaretçi (SHA)**
tutar — içeriği değil.

---

## A. Bir kez kur (her yeni projede)

```bash
# tüketen reponun kökünde
git submodule add <mcpKadir-remote-url> mcp/mcpKadir
cd mcp/mcpKadir && npm install && npm run build && cd -
```

Sonra projeye iki bağ kur:

**1) Server'lar — `.mcp.json`** (işaretçiyi sürece doğrult):
```json
{
  "mcpServers": {
    "doc-fidelity": {
      "command": "node",
      "args": ["mcp/mcpKadir/servers/doc-fidelity/dist/index.js"]
    }
  }
}
```

**2) Skill'ler — `.claude/skills/`** (ajan onları burada arar). İki seçenek:
- *Symlink* (en temiz): `mcp/mcpKadir/skills/doc-consistency` → `.claude/skills/doc-consistency`
- *İnce sarmalayıcı*: repoya küçük bir `.claude/skills/doc-consistency/SKILL.md` koy, içinde
  "mcpKadir'deki generic doc-consistency skill'ini şu kurallarla çalıştır" de.

**3) Projeye özel uzmanlaşma — tüketen repoda kalır, mcpKadir'e GİRMEZ:**
- `.mcp-doc-fidelity.json` — doc/code/ignore glob'ları.
- `docs/consistency-rules.md` — bu projenin "tutarlı ne demek" kriterleri (generic skill bunu okur).

> Özet: generic motor submodule'de; projeye özel her şey tüketen repoda. Branch yok.

---

## B. Edit döngüsü (asıl kafa karıştıran kısım)

Başka bir projede çalışırken mcpKadir'i değiştirmek istedin. Submodule gerçek bir repo olduğu
için **onun içine girip düzenler, commit'ler, push'larsın** — bunlar mcpKadir'in kendi remote'una
gider. Sonra tüketen repoda sadece **işaretçiyi** yeni commit'e oynatırsın.

```bash
# 1) submodule'ün İÇİNE gir — burası gerçek mcpKadir reposu
cd mcp/mcpKadir

# 2) ana dalda olduğundan emin ol (submodule default'ta "detached HEAD" olabilir)
git checkout main && git pull

# 3) düzenle, build et, test et
#    (servers/skills üzerinde değişiklik yap)
npm run build

# 4) mcpKadir'in KENDİ reposuna commit + push
git add -A && git commit -m "doc-fidelity: ..." && git push

# 5) tüketen repoya geri çık
cd -

# 6) tüketen repo artık submodule işaretçisinin oynadığını görür — bunu commit'le
git add mcp/mcpKadir && git commit -m "bump mcpKadir submodule"
```

Adım 6 olmazsa: mcpKadir güncellenir ama tüketen repo hâlâ eski commit'i işaret eder.
İşaretçi bump'ı = "bu proje artık mcpKadir'in şu sürümünü kullanıyor" demek.

### Başka bir projede yaptığın güncellemeyi çekmek
mcpKadir'i A projesinde geliştirdin, B projesi de güncellensin:
```bash
# B reposunda
git submodule update --remote mcp/mcpKadir   # submodule'ü remote main'in ucuna getirir
cd mcp/mcpKadir && npm install && npm run build && cd -
git add mcp/mcpKadir && git commit -m "bump mcpKadir submodule"
```

### Repoyu ilk klonlarken submodule'ü de getirmek
```bash
git clone --recurse-submodules <consumer-url>
# zaten klonladıysan:
git submodule update --init --recursive
```

---

## Neden branch-per-project değil

Her proje için ayrı bir mcpKadir branch'i tutma cazip gelir ama:
- Submodule zaten **SHA pinler**, branch değil — sürüm farkını işaretçi taşır, yeterli.
- N tane uzun-ömürlü branch = her generic iyileştirmeyi hepsine merge etme cehennemi.
- "Hangi proje neyi kullanıyor" bilgisi branch topolojisinde sorgulanamaz; o bilgi tüketen
  reponun `.mcp.json` + kuralları dosyasında **veri** olarak durmalı.

Projeler arası "kim neyi kullanıyor" envanterini istiyorsan: her reponun config'ini okuyup
rapor üreten küçük bir aggregator (ki o da bir mcpKadir server'ı olabilir) yaz — branch sayma.
