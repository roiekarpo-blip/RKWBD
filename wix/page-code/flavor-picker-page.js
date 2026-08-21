/*
 * קוד עמוד (Velo) לעמוד שמכיל את <hof-flavor-picker>.
 * להדבקה בפאנל הקוד של העמוד ב-Wix Studio.
 *
 * תפקידו: להזין לאלמנט את רשימת הטעמים מה-CMS, ולהמיר לחיצה על
 * "הוספה לסל" לפעולה אמיתית בסל של Wix Stores.
 *
 * דרישות מוקדמות:
 *   1. האלמנט מותקן בעמוד עם ה-ID ‎#flavorPicker‎ (נקבע בפאנל המאפיינים).
 *   2. קולקציית CMS בשם Flavors — ראו את מבנה השדות ב-wix/README.md.
 *   3. Wix Stores מותקן באתר, עם מוצר לכל טעם ווריאנט לכל גודל.
 */

import wixData from 'wix-data';
import { currentCartV2 } from '@wix/ecom';
import { ecom } from '@wix/site-ecom';
import wixLocationFrontend from 'wix-location-frontend';

// מזהה האפליקציה של Wix Stores. קבוע לכל האתרים — אין צורך לשנות.
const WIX_STORES_APP_ID = '1380b703-ce81-ff05-f115-39571d94dfcd';

$w.onReady(async () => {
  const picker = $w('#flavorPicker');

  picker.on('addtocart', (event) => handleAddToCart(event.detail));

  // אופציונלי: עדכון כותרת/טקסט נוסף בעמוד בכל החלפת טעם.
  picker.on('flavorchange', (event) => {
    const { name } = event.detail;
    if ($w('#flavorTitle').type) $w('#flavorTitle').text = name;
  });

  try {
    const flavors = await loadFlavors();
    // setAttribute מקבל מחרוזת בלבד, ולכן ה-JSON עובר מסודרת.
    picker.setAttribute('flavors', JSON.stringify(flavors));
    picker.setAttribute('initial', 'גנאש');
  } catch (err) {
    console.error('טעינת הטעמים נכשלה, האלמנט יציג את רשימת ברירת המחדל שלו.', err);
  }
});

/**
 * שולף את הטעמים מה-CMS וממיר אותם למבנה שהאלמנט מצפה לו.
 * הסדר בקולקציה (שדה order) הוא הסדר ברצועה.
 */
async function loadFlavors() {
  const { items } = await wixData.query('Flavors')
    .eq('active', true)
    .ascending('order')
    .limit(50)
    .find();

  return items.map((item) => ({
    name: item.title,
    color: item.color,
    isSet: Boolean(item.isSet),
    scale: item.imageScale || 1,
    // wixData מחזיר תמונות כ-URL מוכן לשימוש ב-src.
    tileImage: item.tileImage,
    bagImage: item.bagImage,
    sizes: {
      S: buildSize(item.priceS, item.productId, item.variantIdS),
      M: buildSize(item.priceM, item.productId, item.variantIdM),
      L: buildSize(item.priceL, item.productId, item.variantIdL),
    },
  }));
}

/** גודל בלי מחיר מוגדר לא נשלח כלל, וכך הכפתור שלו מוצג מנוטרל. */
function buildSize(price, productId, variantId) {
  if (price === undefined || price === null || price === '') return undefined;
  return { price, productId, variantId };
}

async function handleAddToCart(selection) {
  const { name, size, isSet, productId, variantId } = selection;

  // אריח "מארזים" אינו מוצר — הוא שולח את הגולש לעמוד המארזים.
  if (isSet) {
    wixLocationFrontend.to('/packages');
    return;
  }

  if (!productId) {
    console.error(`לטעם "${name}" בגודל ${size} אין productId בקולקציה — לא ניתן להוסיף לסל.`);
    return;
  }

  try {
    await currentCartV2.addLineItemsToCurrentCart({
      catalogItems: [{
        catalogReference: {
          appId: WIX_STORES_APP_ID,
          catalogItemId: productId,
          // הווריאנט הוא שקובע את הגודל ואת המחיר בפועל בסל.
          ...(variantId ? { options: { variantId } } : {}),
        },
        quantity: 1,
      }],
    });

    // מרענן את אייקון הסל ואת הסל הצדי כדי שיציגו את המצב החדש.
    await ecom.refreshCart();
    await ecom.openSideCart();
  } catch (err) {
    console.error(`הוספת "${name}" בגודל ${size} לסל נכשלה.`, err);
  }
}
