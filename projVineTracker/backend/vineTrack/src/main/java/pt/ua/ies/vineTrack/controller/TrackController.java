package pt.ua.ies.vineTrack.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.media.Content;

import pt.ua.ies.vineTrack.entity.Track;
import pt.ua.ies.vineTrack.service.TrackService;

@CrossOrigin("*")
@RestController
@RequestMapping(path = "/api/tracks")
@Tag(name = "Tracks", description = "Operations for tracks")
public class TrackController {

    @Autowired
    TrackService trackService;

    @GetMapping()
    @Operation(summary = "Get all tracks")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved"),
        @ApiResponse(responseCode = "404", description = "Not found", content = @Content),
    })
    public ResponseEntity<List<Track>> getAllVines(){
        try {
            return ResponseEntity.ok(trackService.getAllTracks());
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
}
