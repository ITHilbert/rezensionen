<?php

namespace ITHilbert\Rezensionen\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Rezension extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'rezensionen';
    protected $primaryKey = 'id';
    protected $guarded = ['id'];
    public $timestamps = true;


    public static function getRezensionen(){
        $rezensionen = config('rezension.rezensionen');
        $anz = 0;
        $ausgabe = '';
        foreach( $rezensionen as $rez){
            if($anz == 0){
                $ausgabe .= '<div class="carousel-item active text-center">';
            }else{
                $ausgabe .= '<div class="carousel-item text-center">';
            }
            $ausgabe .= '<img src="'. asset('vendor/rezensionen/5-stars.png') .'" height="20" width="114" alt="5 Sterne">';
            $ausgabe .= '<p class="text-black mt-2 rezension-text">';
            $ausgabe .= $rez['rezension'];
            $ausgabe .= '</p>';
            $ausgabe .= '<h5>'. $rez['author'].'</h5>';
            $ausgabe .= '</div>';
            $anz++;
        }
        return $ausgabe;
    }


}
