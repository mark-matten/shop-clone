import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Generate an upload URL for user photos
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save uploaded photo metadata
export const saveUserPhoto = mutation({
  args: {
    clerkId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    setAsDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // If setting as default, unset any existing default
    if (args.setAsDefault) {
      const existingPhotos = await ctx.db
        .query("user_photos")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
        .collect();

      for (const photo of existingPhotos) {
        if (photo.isDefault) {
          await ctx.db.patch(photo._id, { isDefault: false });
        }
      }
    }

    // Check if this is the first photo (make it default automatically)
    const existingCount = await ctx.db
      .query("user_photos")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .collect();

    const isDefault = args.setAsDefault ?? existingCount.length === 0;

    return await ctx.db.insert("user_photos", {
      clerkId: args.clerkId,
      storageId: args.storageId,
      fileName: args.fileName,
      uploadedAt: Date.now(),
      isDefault,
    });
  },
});

// Get user's photos
export const getUserPhotos = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("user_photos")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .collect();

    // Get URLs for each photo
    return await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      }))
    );
  },
});

// Get user's default photo
export const getDefaultPhoto = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("user_photos")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    if (!photos) return null;

    return {
      ...photos,
      url: await ctx.storage.getUrl(photos.storageId),
    };
  },
});

// Set a photo as default
export const setDefaultPhoto = mutation({
  args: {
    clerkId: v.string(),
    photoId: v.id("user_photos"),
  },
  handler: async (ctx, args) => {
    // Verify the photo belongs to the user
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.clerkId !== args.clerkId) {
      throw new Error("Photo not found or access denied");
    }

    // Unset any existing default
    const existingPhotos = await ctx.db
      .query("user_photos")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .collect();

    for (const p of existingPhotos) {
      if (p.isDefault && p._id !== args.photoId) {
        await ctx.db.patch(p._id, { isDefault: false });
      }
    }

    // Set the new default
    await ctx.db.patch(args.photoId, { isDefault: true });
  },
});

// Delete a user photo
export const deleteUserPhoto = mutation({
  args: {
    clerkId: v.string(),
    photoId: v.id("user_photos"),
  },
  handler: async (ctx, args) => {
    // Verify the photo belongs to the user
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.clerkId !== args.clerkId) {
      throw new Error("Photo not found or access denied");
    }

    // Delete from storage
    await ctx.storage.delete(photo.storageId);

    // Delete metadata
    await ctx.db.delete(args.photoId);

    // If this was the default, set another photo as default
    if (photo.isDefault) {
      const remainingPhotos = await ctx.db
        .query("user_photos")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
        .first();

      if (remainingPhotos) {
        await ctx.db.patch(remainingPhotos._id, { isDefault: true });
      }
    }
  },
});

// Get a file URL by storage ID (for generated images, etc.)
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Save generated outfit image (creates new or updates existing)
export const saveOutfitImage = mutation({
  args: {
    clerkId: v.string(),
    storageId: v.optional(v.id("_storage")), // Optional when updating existing outfit
    itemIds: v.optional(v.array(v.string())), // Optional when updating existing outfit
    userPhotoId: v.optional(v.id("user_photos")),
    prompt: v.optional(v.string()), // Optional when updating existing outfit
    name: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    existingOutfitId: v.optional(v.id("outfit_images")), // If provided, update instead of insert
  },
  handler: async (ctx, args) => {
    // If updating an existing outfit
    if (args.existingOutfitId) {
      const existing = await ctx.db.get(args.existingOutfitId);
      if (existing && existing.clerkId === args.clerkId) {
        await ctx.db.patch(args.existingOutfitId, {
          name: args.name,
          collectionId: args.collectionId,
        });
        return args.existingOutfitId;
      }
    }

    // Create new outfit - storageId, itemIds, and prompt are required for new outfits
    if (!args.storageId || !args.itemIds || !args.prompt) {
      throw new Error("storageId, itemIds, and prompt are required for new outfits");
    }

    // Generate default name if not provided
    let outfitName = args.name;
    if (!outfitName || outfitName.trim() === "") {
      // Count existing outfits to generate the next number
      const existingOutfits = await ctx.db
        .query("outfit_images")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
        .collect();
      const outfitNumber = existingOutfits.length + 1;
      outfitName = `Outfit #${outfitNumber}`;
    }

    const outfitId = await ctx.db.insert("outfit_images", {
      clerkId: args.clerkId,
      storageId: args.storageId,
      itemIds: args.itemIds,
      userPhotoId: args.userPhotoId,
      generatedAt: Date.now(),
      prompt: args.prompt,
      name: outfitName,
      collectionId: args.collectionId,
    });

    // Notify followers asynchronously
    await ctx.scheduler.runAfter(0, internal.closet.notifyFollowersOfNewOutfit, {
      clerkId: args.clerkId,
      outfitName: outfitName,
    });

    return outfitId;
  },
});

// Get only saved outfits (those with names or in collections)
export const getSavedOutfits = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const allOutfits = await ctx.db
      .query("outfit_images")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .order("desc")
      .collect();

    // Filter to only saved outfits (have name or collectionId)
    const savedOutfits = allOutfits
      .filter((outfit) => outfit.name || outfit.collectionId)
      .slice(0, limit);

    // Get URLs and related data for each outfit
    return await Promise.all(
      savedOutfits.map(async (outfit) => {
        const url = await ctx.storage.getUrl(outfit.storageId);

        // Get item details
        const itemIdsToLookup: string[] = outfit.itemIds ||
          (outfit.closetItemIds ? outfit.closetItemIds.map(id => id.toString()) : []);
        const items = await Promise.all(
          itemIdsToLookup.map(async (id) => {
            // Try by _id first
            let closetItemDoc = await ctx.db
              .query("closet_items")
              .filter((q) => q.eq(q.field("_id"), id as any))
              .first();

            // If not found, try by productId
            if (!closetItemDoc) {
              closetItemDoc = await ctx.db
                .query("closet_items")
                .filter((q) => q.eq(q.field("productId"), id as any))
                .first();
            }

            if (closetItemDoc) {
              let imageUrl = closetItemDoc.imageUrl;
              if (closetItemDoc.source === "generated" && closetItemDoc.generatedImageStorageId) {
                imageUrl = await ctx.storage.getUrl(closetItemDoc.generatedImageStorageId) ?? undefined;
              }
              // Get product info if linked
              if (closetItemDoc.productId) {
                const product = await ctx.db.get(closetItemDoc.productId);
                return {
                  _id: closetItemDoc._id,
                  productId: closetItemDoc.productId.toString(), // String for linking
                  name: product?.name || closetItemDoc.name,
                  imageUrl: product?.imageUrl || imageUrl,
                  brand: product?.brand,
                  price: product?.price,
                  category: closetItemDoc.customCategory || product?.category || closetItemDoc.category,
                  material: closetItemDoc.material || product?.material,
                  gender: closetItemDoc.gender || product?.gender,
                  colorName: closetItemDoc.colorName || product?.colorName,
                  size: closetItemDoc.selectedSize || closetItemDoc.size,
                };
              }
              return {
                _id: closetItemDoc._id,
                productId: undefined, // No product link for user-added items
                name: closetItemDoc.name,
                imageUrl,
                category: closetItemDoc.customCategory || closetItemDoc.category,
                material: closetItemDoc.material,
                gender: closetItemDoc.gender,
                colorName: closetItemDoc.color || closetItemDoc.colorName,
                size: closetItemDoc.size,
              };
            }
            return null;
          })
        );

        return {
          _id: outfit._id,
          url,
          generatedAt: outfit.generatedAt,
          prompt: outfit.prompt,
          name: outfit.name,
          collectionId: outfit.collectionId,
          items: items.filter((i): i is NonNullable<typeof i> => i !== null),
        };
      })
    );
  },
});

// Get user's outfit history
export const getOutfitHistory = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const allOutfits = await ctx.db
      .query("outfit_images")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .order("desc")
      .collect();

    // Filter out hidden outfits and limit
    const outfits = allOutfits
      .filter((o) => !o.hiddenFromRecent)
      .slice(0, limit);

    // Get URLs and related data for each outfit
    return await Promise.all(
      outfits.map(async (outfit) => {
        const url = await ctx.storage.getUrl(outfit.storageId);

        // Get item details - support both new itemIds and legacy closetItemIds
        // New itemIds are strings (can be closet_items or favorites IDs)
        // Legacy closetItemIds are typed closet_items IDs
        const itemIdsToLookup: string[] = outfit.itemIds ||
          (outfit.closetItemIds ? outfit.closetItemIds.map(id => id.toString()) : []);
        const items = await Promise.all(
          itemIdsToLookup.map(async (id) => {
            // Try closet_items table first - by _id
            let closetItemDoc = await ctx.db
              .query("closet_items")
              .filter((q) => q.eq(q.field("_id"), id as any))
              .first();

            // If not found by _id, try by productId (for items saved with product IDs)
            if (!closetItemDoc) {
              closetItemDoc = await ctx.db
                .query("closet_items")
                .filter((q) => q.eq(q.field("productId"), id as any))
                .first();
            }

            if (closetItemDoc) {
              // For product-linked closet items
              if (closetItemDoc.productId) {
                const product = await ctx.db.get(closetItemDoc.productId);
                return {
                  _id: closetItemDoc._id,
                  name: product?.name || closetItemDoc.name || "Unknown",
                  brand: product?.brand || closetItemDoc.brand || "",
                  imageUrl: product?.imageUrl || closetItemDoc.imageUrl,
                  category: closetItemDoc.customCategory || product?.category || closetItemDoc.category || "other",
                  colorName: closetItemDoc.colorName || closetItemDoc.selectedOptions?.["Color"] || product?.colorName,
                  size: closetItemDoc.selectedSize || closetItemDoc.selectedOptions?.["Size"] || closetItemDoc.size,
                  material: closetItemDoc.material || product?.material,
                  gender: closetItemDoc.gender || product?.gender,
                  productId: closetItemDoc.productId.toString(), // For linking to product page
                };
              }

              // For user-added items (URL-sourced or generated)
              let imageUrl = closetItemDoc.imageUrl;
              if (closetItemDoc.generatedImageStorageId) {
                imageUrl = await ctx.storage.getUrl(closetItemDoc.generatedImageStorageId) || undefined;
              }

              return {
                _id: closetItemDoc._id,
                name: closetItemDoc.name || "Unknown",
                brand: closetItemDoc.brand || "",
                imageUrl,
                category: closetItemDoc.customCategory || closetItemDoc.category || "other",
                colorName: closetItemDoc.color,
                size: closetItemDoc.size,
                material: closetItemDoc.material,
                gender: closetItemDoc.gender,
                productId: undefined, // No product link for URL/generated items
              };
            }

            // Try favorites table (for wishlist items)
            const favorite = await ctx.db
              .query("favorites")
              .filter((q) => q.eq(q.field("_id"), id as any))
              .first();

            if (favorite && favorite.productId) {
              const product = await ctx.db.get(favorite.productId);
              if (product) {
                return {
                  _id: favorite._id,
                  name: product.name || "Unknown",
                  brand: product.brand || "",
                  imageUrl: product.imageUrl,
                  category: product.category || "other",
                  colorName: favorite.selectedOptions?.["Color"] || product.colorName,
                  size: favorite.selectedOptions?.["Size"],
                  material: product.material,
                  gender: product.gender,
                  productId: favorite.productId.toString(), // For linking to product page
                };
              }
            }

            return null;
          })
        );

        // Get user photo if used
        let userPhoto = null;
        if (outfit.userPhotoId) {
          const photo = await ctx.db.get(outfit.userPhotoId);
          if (photo) {
            userPhoto = {
              ...photo,
              url: await ctx.storage.getUrl(photo.storageId),
            };
          }
        }

        return {
          ...outfit,
          url,
          items: items.filter(Boolean),
          userPhoto,
        };
      })
    );
  },
});

// Update an outfit image (name, collection)
export const updateOutfitImage = mutation({
  args: {
    clerkId: v.string(),
    outfitId: v.id("outfit_images"),
    name: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
  },
  handler: async (ctx, args) => {
    const outfit = await ctx.db.get(args.outfitId);
    if (!outfit || outfit.clerkId !== args.clerkId) {
      throw new Error("Outfit not found or access denied");
    }

    const updates: { name?: string; collectionId?: Id<"collections"> } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.collectionId !== undefined) updates.collectionId = args.collectionId;

    await ctx.db.patch(args.outfitId, updates);
    return { success: true };
  },
});

// Delete an outfit image
export const deleteOutfitImage = mutation({
  args: {
    clerkId: v.string(),
    outfitId: v.id("outfit_images"),
  },
  handler: async (ctx, args) => {
    const outfit = await ctx.db.get(args.outfitId);
    if (!outfit || outfit.clerkId !== args.clerkId) {
      throw new Error("Outfit not found or access denied");
    }

    // Delete from storage
    await ctx.storage.delete(outfit.storageId);

    // Delete metadata
    await ctx.db.delete(args.outfitId);
  },
});

// Clear all recent outfits from the view
// - Unsaved outfits (no name, no collection) are deleted
// - Saved outfits are hidden from view but not deleted
export const clearRecentOutfits = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const outfits = await ctx.db
      .query("outfit_images")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .collect();

    // Filter to only visible outfits
    const visibleOutfits = outfits.filter((o) => !o.hiddenFromRecent);

    let deleted = 0;
    let hidden = 0;

    for (const outfit of visibleOutfits) {
      const isSaved = outfit.name || outfit.collectionId;

      if (isSaved) {
        // Hide saved outfits from recent view (don't delete)
        await ctx.db.patch(outfit._id, { hiddenFromRecent: true });
        hidden++;
      } else {
        // Delete unsaved outfits completely
        await ctx.storage.delete(outfit.storageId);
        await ctx.db.delete(outfit._id);
        deleted++;
      }
    }

    return { deleted, hidden };
  },
});

// Hide a single outfit from recent view (for saved outfits) or delete (for unsaved)
export const hideOrDeleteOutfit = mutation({
  args: {
    clerkId: v.string(),
    outfitId: v.id("outfit_images"),
  },
  handler: async (ctx, args) => {
    const outfit = await ctx.db.get(args.outfitId);
    if (!outfit || outfit.clerkId !== args.clerkId) {
      throw new Error("Outfit not found or access denied");
    }

    const isSaved = outfit.name || outfit.collectionId;

    if (isSaved) {
      // Hide saved outfits from recent view (don't delete)
      await ctx.db.patch(args.outfitId, { hiddenFromRecent: true });
      return { action: "hidden" };
    } else {
      // Delete unsaved outfits completely
      await ctx.storage.delete(outfit.storageId);
      await ctx.db.delete(args.outfitId);
      return { action: "deleted" };
    }
  },
});

// Get public outfit by ID (for sharing)
export const getPublicOutfit = query({
  args: { outfitId: v.id("outfit_images") },
  handler: async (ctx, args) => {
    const outfit = await ctx.db.get(args.outfitId);
    if (!outfit) return null;

    // Get the user to check if closet is public
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", outfit.clerkId))
      .first();

    if (!user || !user.isPublicCloset) {
      return { isPrivate: true };
    }

    // Get the outfit image URL
    const url = await ctx.storage.getUrl(outfit.storageId);

    // Get item details
    const itemIdsToLookup: string[] = outfit.itemIds ||
      (outfit.closetItemIds ? outfit.closetItemIds.map(id => id.toString()) : []);

    const items = await Promise.all(
      itemIdsToLookup.map(async (id) => {
        // Try by _id first
        let closetItemDoc = await ctx.db
          .query("closet_items")
          .filter((q) => q.eq(q.field("_id"), id as any))
          .first();

        // If not found, try by productId
        if (!closetItemDoc) {
          closetItemDoc = await ctx.db
            .query("closet_items")
            .filter((q) => q.eq(q.field("productId"), id as any))
            .first();
        }

        if (closetItemDoc) {
          let imageUrl = closetItemDoc.imageUrl;
          if (closetItemDoc.generatedImageStorageId) {
            imageUrl = await ctx.storage.getUrl(closetItemDoc.generatedImageStorageId) || undefined;
          }

          // For product-linked items
          if (closetItemDoc.productId) {
            const product = await ctx.db.get(closetItemDoc.productId);
            return {
              _id: closetItemDoc._id,
              productId: closetItemDoc.productId.toString(), // String for linking to product page
              name: product?.name || closetItemDoc.name || "Unknown",
              brand: product?.brand || closetItemDoc.brand || "",
              imageUrl: product?.imageUrl || imageUrl,
              category: closetItemDoc.customCategory || product?.category || closetItemDoc.category || "other",
              colorName: closetItemDoc.colorName || product?.colorName,
              material: closetItemDoc.material || product?.material,
              gender: closetItemDoc.gender || product?.gender,
              size: closetItemDoc.selectedSize || closetItemDoc.size,
              price: product?.price,
              sourceUrl: product?.sourceUrl,
            };
          }

          return {
            _id: closetItemDoc._id,
            productId: undefined, // No product link for URL/generated items
            name: closetItemDoc.name || "Unknown",
            brand: closetItemDoc.brand || "",
            imageUrl,
            category: closetItemDoc.customCategory || closetItemDoc.category || "other",
            colorName: closetItemDoc.color || closetItemDoc.colorName,
            material: closetItemDoc.material,
            gender: closetItemDoc.gender,
            size: closetItemDoc.selectedSize || closetItemDoc.size,
          };
        }
        return null;
      })
    );

    // Build user display name
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const lastInitial = lastName ? `${lastName.charAt(0)}.` : "";
    const displayName = firstName ? `${firstName} ${lastInitial}`.trim() : "User";

    return {
      isPrivate: false,
      outfit: {
        _id: outfit._id,
        url,
        name: outfit.name,
        generatedAt: outfit.generatedAt,
        items: items.filter(Boolean),
      },
      user: {
        _id: user._id,
        clerkId: user.clerkId, // Needed for linking to closet
        displayName, // The user's display name like "Mark M."
      },
    };
  },
});
