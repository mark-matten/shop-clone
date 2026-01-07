import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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

// Save generated outfit image
export const saveOutfitImage = mutation({
  args: {
    clerkId: v.string(),
    storageId: v.id("_storage"),
    itemIds: v.array(v.string()),
    userPhotoId: v.optional(v.id("user_photos")),
    prompt: v.string(),
    name: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("outfit_images", {
      clerkId: args.clerkId,
      storageId: args.storageId,
      itemIds: args.itemIds,
      userPhotoId: args.userPhotoId,
      generatedAt: Date.now(),
      prompt: args.prompt,
      name: args.name,
      collectionId: args.collectionId,
    });
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

    const outfits = await ctx.db
      .query("outfit_images")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .order("desc")
      .take(limit);

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
            // Try closet_items table first
            const closetItemDoc = await ctx.db
              .query("closet_items")
              .filter((q) => q.eq(q.field("_id"), id as any))
              .first();

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
