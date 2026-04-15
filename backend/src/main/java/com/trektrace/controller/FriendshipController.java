package com.trektrace.controller;

import com.trektrace.dto.FriendDTO;
import com.trektrace.dto.FriendRequestDTO;
import com.trektrace.dto.SendFriendRequestDTO;
import com.trektrace.service.FriendshipService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friends")
public class FriendshipController {

    private final FriendshipService friendshipService;

    public FriendshipController(FriendshipService friendshipService) {
        this.friendshipService = friendshipService;
    }

    private Long getUserId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }

    @GetMapping
    public ResponseEntity<List<FriendDTO>> getFriends(Authentication auth) {
        return ResponseEntity.ok(friendshipService.getFriends(getUserId(auth)));
    }

    @GetMapping("/requests")
    public ResponseEntity<List<FriendRequestDTO>> getPendingRequests(Authentication auth) {
        return ResponseEntity.ok(friendshipService.getPendingRequests(getUserId(auth)));
    }

    @PostMapping("/request")
    public ResponseEntity<Void> sendRequest(
            @Valid @RequestBody SendFriendRequestDTO request,
            Authentication auth) {
        friendshipService.sendRequest(getUserId(auth), request.getPhone());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping("/requests/{id}/accept")
    public ResponseEntity<Void> acceptRequest(@PathVariable Long id, Authentication auth) {
        friendshipService.acceptRequest(id, getUserId(auth));
        return ResponseEntity.ok().build();
    }

    @PutMapping("/requests/{id}/decline")
    public ResponseEntity<Void> declineRequest(@PathVariable Long id, Authentication auth) {
        friendshipService.declineRequest(id, getUserId(auth));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFriend(@PathVariable Long id, Authentication auth) {
        friendshipService.deleteFriend(id, getUserId(auth));
        return ResponseEntity.noContent().build();
    }
}
